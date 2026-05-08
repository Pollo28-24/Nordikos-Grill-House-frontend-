import { Injectable, inject, signal, computed, PLATFORM_ID, resource } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { map } from 'rxjs/operators';
import { from, Observable } from 'rxjs';

import { SupabaseService } from '@shared/data-access/supabase.service';
import { SupabaseStorageService } from '@core/services/supabase-storage.service';
import { AuthService } from '@auth/data-access/auth.services';
import { Product, CreateProductDto, UpdateProductDto } from '@core/models/product.model';
import { ProductsApi } from '@core/api/products.api';

@Injectable({ providedIn: 'root' })
export class ProductsService { // ACTÚA COMO STATE / FACADE
  private readonly api = inject(ProductsApi);
  private readonly authService = inject(AuthService);
  private readonly supabaseStorage = inject(SupabaseStorageService);
  private readonly supabase = inject(SupabaseService).client; // Temporalmente para subida de fotos raw
  private readonly platformId = inject(PLATFORM_ID);

  // -----------------------------
  // DATA RESOURCE (Angular 19/20+)
  // -----------------------------
  private productsResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      
      const { data, error } = await this.api.getAll();

      if (error) throw error;
      
      return (data || []).map((row: unknown) => this.mapProductRow(row)) as Product[];
    }
  });

  // -----------------------------
  // STATE (Signal First)
  // -----------------------------
  private _loading = signal(false);
  private _error = signal<string | null>(null);

  // -----------------------------
  // PUBLIC READ-ONLY STATE
  // -----------------------------
  readonly products = computed(() => this.productsResource.value() ?? []);
  readonly loading = computed(() => this.productsResource.isLoading() || this._loading());
  readonly error = computed(() => (this.productsResource.error() as Error)?.message ?? this._error());
  readonly totalProducts = computed(() => this.products().length);

  // -----------------------------
  // OBSERVABLES FOR BACKWARD COMPATIBILITY
  // -----------------------------
  readonly products$ = toObservable(this.products);
  readonly loading$ = toObservable(this.loading);
  readonly error$ = toObservable(this.error);

  // -----------------------------
  // ACTIONS
  // -----------------------------
  reload() {
    this.productsResource.reload();
  }

  // -----------------------------
  // CREATE
  // -----------------------------
  async create(dto: CreateProductDto): Promise<Product | null> {
    return this.executeWithLoading(async () => {
      const user = await this.authService.getUser();
      if (!user.data.user) throw new Error('Usuario no autenticado.');

      // 1. Upload images (CONCURRENTE)
      const uploadedImageUrls = await this.uploadImages(dto.images);

      // 2. Insert product
      const productToInsert = { ...dto };
      delete productToInsert.images;
      delete productToInsert.variants;

      const { data: newProduct, error: productError } = await this.api.insert(productToInsert);
      if (productError) throw productError;

      // 3. Sub-recursos (Imágenes y Variantes - CONCURRENTES)
      const insertTasks: PromiseLike<any>[] = [];

      if (uploadedImageUrls.length > 0) {
        const imagesToInsert = uploadedImageUrls.map((url) => ({ producto_id: newProduct.id, url }));
        insertTasks.push(this.api.insertFotos(imagesToInsert));
      }

      if (dto.variants && dto.variants.length > 0) {
        const variantsToInsert = dto.variants.map((v) => ({
          ...v,
          producto_id: newProduct.id,
          disponible: v.disponible ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        insertTasks.push(this.api.insertVariantes(variantsToInsert));
      }

      await Promise.all(insertTasks); // Ejecutar todo en paralelo
      
      this.reload();
      return newProduct as Product;
    }, null);
  }

  // -----------------------------
  // UPDATE
  // -----------------------------
  async update(id: string, dto: UpdateProductDto): Promise<boolean> {
    return this.executeWithLoading(async () => {
      // Obtenemos producto existente
      const { data: existingProduct, error: fetchError } = await this.api.getById(id);
      if (fetchError) throw fetchError;

      const deleteTasks: PromiseLike<any>[] = [];
      const insertTasks: PromiseLike<any>[] = [];
      const updateTasks: PromiseLike<any>[] = [];

      // Lógica de Imágenes...
      let newImagenUrl: string | null | undefined = undefined;

      if (dto.images !== undefined) {
        const currentImages = existingProduct.producto_fotos || [];
        const currentUrls = currentImages.map((img: any) => img.url);
        const newFiles = dto.images.filter((img): img is File => img instanceof File);
        const imagesToKeep = dto.images.filter((img) => !(img instanceof File) && currentUrls.includes(img.url));

        // Borrar imágenes descartadas en paralelo
        for (const existingImg of currentImages) {
          if (!imagesToKeep.some((keepImg: any) => keepImg.id === existingImg.id)) {
            deleteTasks.push(this.deleteImage(existingImg.url, existingImg.id).catch(e => console.error(e)));
          }
        }

        // Subir nuevas y registrar en DB
        const uploadedUrls = await this.uploadImages(newFiles);
        if (uploadedUrls.length > 0) {
          const newImagesForDb = uploadedUrls.map(url => ({ producto_id: existingProduct.id, url }));
          insertTasks.push(this.api.insertFotos(newImagesForDb));
          newImagenUrl = uploadedUrls[0];
        } else if (imagesToKeep.length === 0) {
          newImagenUrl = null; // Si no hay imágenes, forzamos null en la columna legacy
        } else {
          newImagenUrl = (imagesToKeep[0] as any).url;
        }
      }

      // Lógica de Variantes...
      if (dto.variants) {
        const existingVariantIds = (existingProduct.producto_variantes || []).map((v: any) => String(v.id));
        const variantsToInsert = dto.variants.filter(v => !('id' in v) || !existingVariantIds.includes(String((v as any).id)));
        const variantsToUpdate = dto.variants.filter(v => ('id' in v) && existingVariantIds.includes(String((v as any).id)));
        const variantIdsToDelete = existingVariantIds.filter((id: string) => !dto.variants!.some(v => String((v as any).id) === id));

        if (variantsToInsert.length > 0) {
          insertTasks.push(this.api.insertVariantes(
            variantsToInsert.map(v => ({ ...v, producto_id: existingProduct.id, updated_at: new Date().toISOString() }))
          ));
        }
        
        variantsToUpdate.forEach(v => {
          updateTasks.push(this.api.updateVariante((v as any).id, { ...v, updated_at: new Date().toISOString() }));
        });

        if (variantIdsToDelete.length > 0) {
          deleteTasks.push(this.api.deleteVariantes(variantIdsToDelete));
        }
      }

      // Update base product
      const productToUpdate = { ...dto, updated_at: new Date().toISOString() };
      ['stock', 'images', 'variants', 'productImage', 'imagen_url'].forEach(key => delete (productToUpdate as any)[key]);

      if (newImagenUrl !== undefined) {
        (productToUpdate as any).imagen_url = newImagenUrl;
      }

      updateTasks.push(this.api.update(existingProduct.id, productToUpdate));

      // 💥 Ejecutar todas las transacciones de BD en paralelo
      await Promise.all([...deleteTasks, ...insertTasks, ...updateTasks]);

      this.reload();
      return true;
    }, false);
  }

  // -----------------------------
  // OPTIMIZED REORDER (Native Upsert)
  // -----------------------------
  async updateProductsOrder(products: Product[]): Promise<void> {
    return this.executeWithLoading(async () => {
      const itemsToUpsert = products.map((p, i) => ({
        id: !isNaN(Number(p.id)) ? Number(p.id) : p.id,
        orden: i + 1,
        updated_at: new Date().toISOString()
      }));

      // Optimistic update
      this.productsResource.update(current => {
        if (!current) return current;
        const currentMapped = new Map(current.map(p => [String(p.id), p]));
        return itemsToUpsert.map(u => ({ ...currentMapped.get(String(u.id)), ...u })) as Product[];
      });

      // Un solo request masivo en lugar de iteraciones concurrentes
      try {
        await this.api.upsertOrder(itemsToUpsert);
      } catch (error) {
        this.reload(); // Rollback
        throw error;
      }
    }, undefined);
  }

  async delete(id: string): Promise<boolean> {
    return this.executeWithLoading(async () => {
      // 1. Obtener producto para leer sus fotos
      const { data: product, error: fetchError } = await this.api.getById(id);
      if (fetchError && fetchError.code !== 'PGRST116') { // Ignorar error si no existe
        throw fetchError;
      }

      // 2. Eliminar fotos de Storage
      if (product && product.producto_fotos && product.producto_fotos.length > 0) {
        const deleteImagePromises = product.producto_fotos.map((foto: any) => {
          const imagePath = this.supabaseStorage.extractImagePathFromUrl(foto.url);
          if (imagePath) {
            return this.supabaseStorage.deleteProductImage(imagePath).catch(err => {
               console.warn('Error deleting physical file from storage', err);
            });
          }
          return Promise.resolve();
        });
        await Promise.allSettled(deleteImagePromises);
      }

      // 3. Eliminar de la base de datos (CASCADE se encarga de las tablas hijas)
      const { error } = await this.api.delete(id);
      if (error) throw error;
      this.reload();
      return true;
    }, false);
  }

  async getProduct(id: string): Promise<Product | null> {
    const isNumeric = /^-?\d+$/.test(String(id));
    const parsedId = isNumeric ? Number(id) : id;
    
    const existing = this.products().find(p => p.id == parsedId);
    if (existing) return existing;

    return this.executeWithLoading(async () => {
      const { data, error } = await this.api.getById(parsedId);
      if (error) throw error;
      return data ? this.mapProductRow(data) : null;
    }, null);
  }

  productById = (id: string | number) => computed(() => this.products().find(p => String(p.id) === String(id)));

  // ===============================
  // COMPATIBILITY LAYER & HELPERS
  // ===============================

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const result = await this.create(dto);
    if (!result) throw new Error(this.error() || 'Error creating product');
    return result;
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const result = await this.update(id, dto);
    if (!result) throw new Error(this.error() || 'Error updating product');
    return this.products().find(p => p.id === (!isNaN(Number(id)) ? Number(id) : id))!;
  }

  deleteProduct(id: string): Observable<void> {
    return from(this.delete(id)).pipe(map(success => { if (!success) throw new Error(this.error() || 'Error'); }));
  }

  getProducts(): Observable<Product[]> { return this.products$; }

  getProductById(id: string): Observable<Product> {
    const parsedId = !isNaN(Number(id)) ? Number(id) : id;
    return this.products$.pipe(
      map(products => {
         const product = products.find(p => p.id === parsedId);
         if (!product) throw new Error('Product not found');
         return product;
      })
    );
  }

  getProductsByCategory(categoryId: string): Observable<Product[]> {
    return this.products$.pipe(map(products => products.filter(p => p.categoria_id === categoryId)));
  }

  validateCreateDto(dto: CreateProductDto): string | null {
    if (!dto.nombre || dto.nombre.trim().length < 2) {
      return 'El nombre es obligatorio y debe tener al menos 2 caracteres.';
    }
    if (dto.precio == null || isNaN(dto.precio) || dto.precio < 0 || dto.precio >= 10000000) {
      return 'El precio debe ser un número válido mayor o igual a 0 y menor a 10,000,000.';
    }
    const MAX_IMAGE_SIZE_MB = 5;
    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (dto.images && dto.images.length > 0) {
      for (const file of dto.images) {
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
          return `Tipo de imagen no permitido: ${file.type}. Solo se permiten JPG, PNG, WEBP.`;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          return `El tamaño de la imagen "${file.name}" excede el límite de ${MAX_IMAGE_SIZE_MB}MB.`;
        }
      }
    }
    return null;
  }

  // ===============================
  // PRIVATE UTILS
  // ===============================

  private async executeWithLoading<T>(operation: () => Promise<T>, fallbackValue: T): Promise<T> {
    try {
      this._loading.set(true);
      this._error.set(null);
      return await operation();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as any)?.message || 'Ocurrió un error inesperado';
      this._error.set(msg);
      return fallbackValue;
    } finally {
      this._loading.set(false);
    }
  }

  private mapProductRow(row: any): Product {
    const product = { ...row } as Product;
    
    if (row.producto_fotos?.length) {
      product.images = row.producto_fotos;
      if (!product.imagen_url) product.imagen_url = product.images![0].url;
    }
    
    if (row.producto_variantes?.length) {
      product.variants = row.producto_variantes;
    }
    
    if (row.producto_modificadores?.length) {
      product.modifiers = row.producto_modificadores
        .filter((pm: any) => pm.modificadores)
        .map((pm: any) => ({ ...pm.modificadores, id: pm.modificadores.id }));
    }
    
    return product;
  }

  private async uploadImages(files: (File | undefined)[] | undefined): Promise<string[]> {
    if (!files || files.length === 0) return [];
    const validFiles = files.filter((f): f is File => !!f);
    const bucket = 'imagenes';

    // Subida CONCURRENTE usando Promise.all en vez de for secuencial
    const uploadPromises = validFiles.map(async (file) => {
      const ext = file.name.split('.').pop();
      const filePath = `productos/${crypto.randomUUID()}.${ext}`;
      
      const { error } = await this.supabase.storage.from(bucket).upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) {
        console.error('Error uploading image:', error);
        return null;
      }
      
      const { data } = this.supabase.storage.from(bucket).getPublicUrl(filePath);
      return data?.publicUrl || null;
    });

    const results = await Promise.all(uploadPromises);
    return results.filter((url): url is string => url !== null);
  }

  async deleteImage(imageUrl: string, imageId?: number | string): Promise<void> {
    try {
      const imagePath = this.supabaseStorage.extractImagePathFromUrl(imageUrl);
      if (imagePath) {
        // Envolvemos el borrado de Storage en un catch para que si el archivo físico 
        // ya no existe (o falla), IGUAL podamos borrar el registro de la BD.
        await this.supabaseStorage.deleteProductImage(imagePath).catch(err => {
          console.warn('Error deleting physical file from storage (might not exist)', err);
        });
      }
      // Esta es la parte crítica: borrar de la tabla producto_fotos
      if (imageId) {
        await this.api.deleteFoto(imageId);
      } else {
        await this.api.deleteFotoByUrl(imageUrl);
      }
    } catch (error) {
      console.error('Error in deleteImage:', error);
      throw error;
    }
  }
}
