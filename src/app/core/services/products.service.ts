import { Injectable, inject, signal, computed, PLATFORM_ID, resource } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { map } from 'rxjs/operators';
import { from, Observable, throwError, of } from 'rxjs';

import { SupabaseService } from '../../shared/data-access/supabase.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { AuthService } from '../../auth/data-access/auth.services';
import { Product, CreateProductDto, UpdateProductDto, ProductImage, ProductVariant } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {

  private supabase = inject(SupabaseService).client;
  private storage = inject(SupabaseStorageService);
  private authService = inject(AuthService);
  private supabaseStorage = inject(SupabaseStorageService);
  private platformId = inject(PLATFORM_ID);

  // -----------------------------
  // DATA RESOURCE (Angular 20+)
  // -----------------------------

  private productsResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      
      const { data, error } = await this.supabase
        .from('productos')
        .select(`
          *,
          producto_variantes(*),
          producto_fotos(*),
          producto_modificadores(
            modificador_id,
            modificadores(
              *,
              modificador_categorias(*)
            )
          )
        `)
        .order('nombre');

      if (error) throw error;
      
      return (data || []).map((row: any) => this.mapProductRow(row)) as Product[];
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
  readonly error = computed(() => (this.productsResource.error() as any)?.message ?? this._error());

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
  // CREATE (Optimistic)
  // -----------------------------

  async create(dto: CreateProductDto): Promise<Product | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const user = await this.authService.getUser();
      if (!user.data.user) throw new Error('User not authenticated.');
      const created_by = user.data.user.id;

      // 1. Upload images
      const uploadedImageUrls: string[] = await this.uploadImages(dto.images, created_by);

      // 2. Prepare product data
      const productToInsert: any = { ...dto };
      delete productToInsert.images;
      delete productToInsert.variants;

      // 3. Insert product
      const { data: productData, error: productError } = await this.supabase
        .from('productos')
        .insert(productToInsert)
        .select()
        .single();

      if (productError) throw productError;
      const newProduct: Product = productData;

      // 4. Insert images
      if (uploadedImageUrls.length > 0) {
        const imagesToInsert = uploadedImageUrls.map((url) => ({
          producto_id: newProduct.id,
          url: url,
        }));

        const { data: insertedImages, error: insertImagesError } = await this.supabase
          .from('producto_fotos')
          .insert(imagesToInsert)
          .select('*');

        if (insertImagesError) console.error('Error inserting new images:', insertImagesError);

        if (insertedImages) {
          newProduct.images = insertedImages.map((f: any) => ({
            id: f.id,
            producto_id: f.producto_id,
            url: f.url,
          }));
          if (!newProduct.imagen_url && newProduct.images.length > 0) {
            newProduct.imagen_url = newProduct.images[0].url;
          }
        }
      }

      // 5. Insert variants
      if (dto.variants && dto.variants.length > 0) {
        const variantsToInsert = dto.variants.map((variant) => ({
          producto_id: newProduct.id,
          nombre: variant.nombre,
          precio: variant.precio,
          disponible: variant.disponible ?? true,
          costo: variant.costo,
          descuento: variant.descuento,
          sku: variant.sku,
          embalaje: variant.embalaje,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { data: insertedVariants, error: insertVariantsError } = await this.supabase
          .from('producto_variantes')
          .insert(variantsToInsert)
          .select('*');

        if (insertVariantsError) console.error('Error inserting new variants:', insertVariantsError);

        if (insertedVariants) {
          newProduct.variants = insertedVariants.map((v: any) => ({
            id: v.id,
            producto_id: v.producto_id,
            nombre: v.nombre,
            precio: v.precio,
            costo: v.costo,
            descuento: v.descuento,
            sku: v.sku,
            embalaje: v.embalaje,
            disponible: v.disponible,
            created_at: v.created_at,
            updated_at: v.updated_at,
          }));
        }
      }

      // Optimistic local update removed in favor of resource reload
      this.reload();

      return newProduct;

    } catch (err: any) {
      const msg = this.handleSupabaseError(err);
      this._error.set(msg);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  // -----------------------------
  // UPDATE
  // -----------------------------

  async update(id: string, dto: UpdateProductDto): Promise<boolean> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const user = await this.authService.getUser();
      if (!user.data.user) throw new Error('User not authenticated.');
      const updated_by = user.data.user.id;

      const parsedId = !isNaN(Number(id)) ? Number(id) : id;

      // 1. Obtener el producto existente
      const { data: existingProduct, error: fetchError } = await this.supabase
        .from('productos')
        .select('*, producto_variantes(*), producto_fotos(*)')
        .eq('id', parsedId)
        .single();

      if (fetchError) throw fetchError;

      const normalizedImages: ProductImage[] = existingProduct.producto_fotos?.map((f: any) => ({
        id: f.id,
        producto_id: f.producto_id,
        url: f.url,
      })) ?? [];

      // 2. Gestionar imágenes
      if (dto.images && dto.images.length > 0) {
        const currentImageUrls: string[] = normalizedImages.map((img) => img.url);
        const newImagesToUpload: File[] = [];
        const imagesToKeep: ProductImage[] = [];

        for (const img of dto.images) {
          if (img instanceof File) {
            newImagesToUpload.push(img);
          } else if (img.url && currentImageUrls.includes(img.url)) {
            imagesToKeep.push(img as ProductImage);
          }
        }

        for (const existingImg of normalizedImages) {
          if (!imagesToKeep.some((keepImg) => keepImg.id === existingImg.id)) {
            try {
              await this.deleteImage(existingImg.url);
            } catch (error) {
              console.error(`Failed to delete image ${existingImg.url}:`, error);
            }
          }
        }

        const uploadedNewImageUrls: string[] = await this.uploadImages(newImagesToUpload, updated_by);
        const newImagesForDb = uploadedNewImageUrls.map((url) => ({
          producto_id: parsedId,
          url: url,
        }));

        if (newImagesForDb.length > 0) {
          await this.supabase.from('producto_fotos').insert(newImagesForDb);
        }
      }

      // 3. Gestionar variantes
      const existingVariantIds: string[] = existingProduct.producto_variantes?.map((v: ProductVariant) => String(v.id)) || [];
      const variantsToInsert: any[] = [];
      const variantsToUpdate: { id: string; update: Partial<ProductVariant> }[] = [];
      const variantIdsToDelete: string[] = [];

      if (dto.variants) {
        for (const variant of dto.variants) {
          const hasId = 'id' in variant && (typeof variant.id === 'string' || typeof variant.id === 'number') && !!variant.id;
          const variantIdStr = hasId ? String(variant.id) : '';

          if (hasId && existingVariantIds.includes(variantIdStr)) {
            variantsToUpdate.push({
              id: variantIdStr,
              update: {
                nombre: variant.nombre,
                precio: variant.precio,
                disponible: variant.disponible,
                costo: variant.costo,
                descuento: variant.descuento,
                sku: variant.sku,
                embalaje: variant.embalaje,
                updated_at: new Date().toISOString(),
              },
            });
          } else {
            variantsToInsert.push({
              producto_id: id,
              nombre: variant.nombre ?? '',
              precio: variant.precio ?? 0,
              disponible: variant.disponible ?? true,
              costo: variant.costo,
              descuento: variant.descuento,
              sku: variant.sku,
              embalaje: variant.embalaje,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }
      }

      for (const existingVariant of existingProduct.producto_variantes || []) {
        if (!dto.variants || !dto.variants.some((v) => 'id' in v && String(v.id) === String(existingVariant.id))) {
          variantIdsToDelete.push(existingVariant.id);
        }
      }

      if (variantsToInsert.length > 0) {
        await this.supabase.from('producto_variantes').insert(variantsToInsert);
      }
      for (const variant of variantsToUpdate) {
        await this.supabase.from('producto_variantes').update(variant.update).eq('id', variant.id);
      }
      if (variantIdsToDelete.length > 0) {
        await this.supabase.from('producto_variantes').delete().in('id', variantIdsToDelete);
      }

      // 4. Update Product
      const productToUpdate: any = { ...dto, updated_at: new Date().toISOString() };
      delete productToUpdate.stock;
      delete productToUpdate.images;
      delete productToUpdate.variants;
      delete productToUpdate.productImage;
      delete productToUpdate.imagen_url;

      const { data: updatedProductData, error: updateProductError } = await this.supabase
        .from('productos')
        .update(productToUpdate)
        .eq('id', parsedId)
        .select('*, producto_variantes(*), producto_fotos(*)')
        .single();

      if (updateProductError) throw updateProductError;

      this.reload();

      return true;

    } catch (err: any) {
      const msg = this.handleSupabaseError(err);
      this._error.set(msg);
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  // -----------------------------
  // DELETE
  // -----------------------------

  async delete(id: string): Promise<boolean> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const parsedId = !isNaN(Number(id)) ? Number(id) : id;

      const { error } = await this.supabase
        .from('productos')
        .delete()
        .eq('id', parsedId);

      if (error) throw error;

      this.reload();

      return true;

    } catch (err: any) {
      this._error.set(err.message ?? 'Error al eliminar el producto');
      return false;
    } finally {
      this._loading.set(false);
    }
  }

  // -----------------------------
  // GET SINGLE (Robust)
  // -----------------------------
  async getProduct(id: string): Promise<Product | null> {
    // Determine if ID should be treated as number or string
    const isNumeric = /^-?\d+$/.test(String(id));
    const parsedId = isNumeric ? Number(id) : id;
    
    // 1. Try to find in current resource value
    const existing = this.products().find(p => p.id == parsedId);
    if (existing) return existing;

    // 2. If not found (e.g. reload or direct access), fetch from DB
    try {
      this._loading.set(true);
      const { data, error } = await this.supabase
        .from('productos')
        .select('*, producto_variantes(*), producto_fotos(*)')
        .eq('id', parsedId)
        .single();

      if (error) throw error;
      
      if (data) {
        return this.mapProductRow(data);
      }
      return null;
    } catch (err: any) {
      if (err?.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching product:', err);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  // -----------------------------
  // SELECTOR (Memoized)
  // -----------------------------

  productById = (id: string | number) =>
    computed(() => this.products().find(p => String(p.id) === String(id)));


  // ===============================
  // COMPATIBILITY LAYER & HELPERS
  // ===============================

  // Compatible createProduct wrapper
  async createProduct(dto: CreateProductDto): Promise<Product> {
    const result = await this.create(dto);
    if (!result) throw new Error(this.error() || 'Error creating product');
    return result;
  }

  // Compatible updateProduct wrapper
  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const result = await this.update(id, dto);
    if (!result) throw new Error(this.error() || 'Error updating product');
    return this.products().find(p => p.id === (!isNaN(Number(id)) ? Number(id) : id))!;
  }

  // Compatible deleteProduct wrapper
  deleteProduct(id: string): Observable<void> {
    return from(this.delete(id)).pipe(
      map(success => {
        if (!success) throw new Error(this.error() || 'Error deleting product');
      })
    );
  }

  // Compatible getProducts wrapper (not used by store, but for consumers)
  getProducts(): Observable<Product[]> {
    return this.products$;
  }

  // Compatible getProductById wrapper
  getProductById(id: string): Observable<Product> {
    // Return observable that emits the product from the store
    // Use the computed selector
    const parsedId = !isNaN(Number(id)) ? Number(id) : id;
    return this.products$.pipe(
      map(products => {
         const product = products.find(p => p.id === parsedId);
         if (!product) throw new Error('Product not found');
         return product;
      })
    );
  }

  // Compatible getProductsByCategory wrapper
  getProductsByCategory(categoryId: string): Observable<Product[]> {
    return this.products$.pipe(
      map(products => products.filter(p => p.categoria_id === categoryId))
    );
  }

  // Validation helper
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

  // Private helpers
  private mapProductRow(row: any): Product {
    const product = row as Product;
    if (row.producto_fotos && row.producto_fotos.length) {
      product.images = row.producto_fotos.map((f: any) => ({
        id: f.id,
        producto_id: f.producto_id,
        url: f.url,
      }));
      if (!product.imagen_url && product.images && product.images.length > 0) {
        product.imagen_url = product.images[0].url;
      }
    }
    if (row.producto_variantes && row.producto_variantes.length) {
      product.variants = row.producto_variantes.map((v: any) => ({
        id: v.id,
        producto_id: v.producto_id,
        nombre: v.nombre,
        precio: v.precio,
        costo: v.costo,
        descuento: v.descuento,
        sku: v.sku,
        embalaje: v.embalaje,
        disponible: v.disponible,
        created_at: v.created_at,
        updated_at: v.updated_at,
      }));
    }
    if (row.producto_modificadores && row.producto_modificadores.length) {
      product.modifiers = row.producto_modificadores
        .filter((pm: any) => pm.modificadores)
        .map((pm: any) => ({
          id: pm.modificadores.id,
          categoria_id: pm.modificadores.categoria_id,
          nombre: pm.modificadores.nombre,
          precio: pm.modificadores.precio,
          costo: pm.modificadores.costo,
          descuento: pm.modificadores.descuento,
          sku: pm.modificadores.sku,
          visible: pm.modificadores.visible,
          cantidad_maxima: pm.modificadores.cantidad_maxima,
          modificador_categorias: pm.modificadores.modificador_categorias
        }));
    }
    return product;
  }

  private async uploadImages(files: (File | undefined)[] | undefined, created_by: string): Promise<string[]> {
    const uploadedUrls: string[] = [];
    if (!files || files.length === 0) return uploadedUrls;
    const bucket = 'imagenes';
    for (const file of files) {
      if (!file) continue;
      const ext = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `productos/${fileName}`;
      try {
        const { error: uploadError } = await this.supabase.storage
          .from(bucket)
          .upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) {
          console.error('Error uploading image to storage:', uploadError);
          continue;
        }
        const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
    return uploadedUrls;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const imagePath = this.supabaseStorage.extractImagePathFromUrl(imageUrl);
      await this.supabaseStorage.deleteProductImage(imagePath);
      const { error } = await this.supabase.from('producto_fotos').delete().eq('url', imageUrl);
      if (error) throw error;
    } catch (error) {
      console.error('Error in deleteImage:', error);
      throw error;
    }
  }

  private handleSupabaseError(err: any): string {
    if (err?.message) return err.message;
    return 'Ocurrió un error inesperado';
  }
}
