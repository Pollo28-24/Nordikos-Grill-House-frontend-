import { Injectable, inject, signal, computed, PLATFORM_ID, resource } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { from, Observable } from 'rxjs';

import { SupabaseService } from '../../shared/data-access/supabase.service';
import { SupabaseStorageService } from './supabase-storage.service';
import { AuthService } from '../../auth/data-access/auth.services';
import { LoggerService } from './logger.service';
import { Product, CreateProductDto, UpdateProductDto, ProductImage, ProductVariant } from '../models/product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {

  private supabase = inject(SupabaseService).client;
  private storage = inject(SupabaseStorageService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private logger = inject(LoggerService);

  private productsResource = resource({
    loader: async () => {
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

  private _loading = signal(false);
  private _error = signal<string | null>(null);

  readonly products = computed(() => this.productsResource.value() ?? []);
  readonly loading = computed(() => this.productsResource.isLoading() || this._loading());
  readonly error = computed(() => (this.productsResource.error() as any)?.message ?? this._error());

  readonly totalProducts = computed(() => this.products().length);

  readonly products$ = toObservable(this.products);
  readonly loading$ = toObservable(this.loading);
  readonly error$ = toObservable(this.error);

  reload() {
    this.productsResource.reload();
  }

  async create(dto: CreateProductDto): Promise<Product | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const user = await this.authService.getUser();
      if (!user.data.user) throw new Error('User not authenticated.');
      const created_by = user.data.user.id;

      const uploadedImageUrls: string[] = await this.uploadImages(dto.images, created_by);

      const productToInsert: any = { ...dto };
      delete productToInsert.images;
      delete productToInsert.variants;

      const { data: productData, error: productError } = await this.supabase
        .from('productos')
        .insert(productToInsert)
        .select()
        .single();

      if (productError) throw productError;
      const newProduct: Product = productData;

      if (uploadedImageUrls.length > 0) {
        const imagesToInsert = uploadedImageUrls.map((url) => ({
          producto_id: newProduct.id,
          url: url,
        }));

        const { data: insertedImages, error: insertImagesError } = await this.supabase
          .from('producto_fotos')
          .insert(imagesToInsert)
          .select('*');

        if (insertImagesError) {
          this.logger.error('Error inserting new images', insertImagesError, 'ProductsService');
        }

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

        if (insertVariantsError) {
          this.logger.error('Error inserting new variants', insertVariantsError, 'ProductsService');
        }

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

  async update(id: string, dto: UpdateProductDto): Promise<boolean> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const user = await this.authService.getUser();
      if (!user.data.user) throw new Error('User not authenticated.');

      const parsedId = !isNaN(Number(id)) ? Number(id) : id;

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
              this.logger.error(`Failed to delete image ${existingImg.url}`, error, 'ProductsService');
            }
          }
        }

        const uploadedNewImageUrls: string[] = await this.uploadImages(newImagesToUpload, user.data.user.id);
        const newImagesForDb = uploadedNewImageUrls.map((url) => ({
          producto_id: parsedId,
          url: url,
        }));

        if (newImagesForDb.length > 0) {
          await this.supabase.from('producto_fotos').insert(newImagesForDb);
        }
      }

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

      const productToUpdate: any = { ...dto, updated_at: new Date().toISOString() };

      delete productToUpdate.images;
      delete productToUpdate.variants;
      delete productToUpdate.productImage;
      delete productToUpdate.imagen_url;

      const { error: updateProductError } = await this.supabase
        .from('productos')
        .update(productToUpdate)
        .eq('id', parsedId);

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

  async getProduct(id: string): Promise<Product | null> {
    const isNumeric = /^-?\d+$/.test(String(id));
    const parsedId = isNumeric ? Number(id) : id;
    
    const existing = this.products().find(p => p.id == parsedId);
    if (existing) return existing;

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
      this.logger.error('Error fetching product', err, 'ProductsService');
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  productById = (id: string | number) =>
    computed(() => this.products().find(p => String(p.id) === String(id)));

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

  deleteProduct(id: string): Observable<boolean> {
    return from(this.delete(id));
  }

  getProducts(): Observable<Product[]> {
    return this.products$;
  }

  getProductById(id: string): Observable<Product | undefined> {
    const parsedId = !isNaN(Number(id)) ? Number(id) : id;
    return new Observable((observer) => {
      const subscription = this.products$.subscribe((products) => {
        const product = products.find(p => String(p.id) === String(parsedId));
        observer.next(product);
        observer.complete();
      });
      return () => subscription.unsubscribe();
    });
  }

  getProductsByCategory(categoryId: string): Observable<Product[]> {
    return this.products$;
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
          this.logger.error('Error uploading image to storage', uploadError, 'ProductsService');
          continue;
        }
        const { data: urlData } = this.supabase.storage.from(bucket).getPublicUrl(filePath);
        if (urlData?.publicUrl) {
          uploadedUrls.push(urlData.publicUrl);
        }
      } catch (error) {
        this.logger.error('Error uploading image', error, 'ProductsService');
      }
    }
    return uploadedUrls;
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      const imagePath = this.storage.extractImagePathFromUrl(imageUrl);
      await this.storage.deleteProductImage(imagePath);
      const { error } = await this.supabase.from('producto_fotos').delete().eq('url', imageUrl);
      if (error) throw error;
    } catch (error) {
      this.logger.error('Error in deleteImage', error, 'ProductsService');
      throw error;
    }
  }

  private handleSupabaseError(err: any): string {
    if (err?.message) return err.message;
    return 'Ocurrió un error inesperado';
  }
}
