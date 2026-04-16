import { Injectable, inject, signal, computed, PLATFORM_ID, resource } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SupabaseService } from '@shared/data-access/supabase.service';
import { ToastService } from './toast.service';
import { ProductsService } from './products.service';
import { LoggerService } from './logger.service';

export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  visible?: boolean;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

export type CategoryWithCount = Category & {
  productos?: { count: number }[];
};

@Injectable({
  providedIn: 'root',
})
export class CategoriesService {
  private supabase = inject(SupabaseService).client;
  private toastService = inject(ToastService);
  private productsService = inject(ProductsService);
  private platformId = inject(PLATFORM_ID);
  private logger = inject(LoggerService);

  private categoriesResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      try {
        const { data, error } = await this.supabase
          .from('categorias')
          .select('*, productos(count)')
          .order('nombre');

        if (error) {
          this.logger.error('Error loading categories', error, 'CategoriesService');
          throw error;
        }
        
        const mapped = (data || []).map((row: any) => ({
          ...row,
          products_count: row.productos?.[0]?.count ?? 0,
        })) as Category[];

        if (mapped.length === 0) {
          this.logger.warn('No categories found', 'CategoriesService');
        }

        return mapped;
      } catch (e) {
        this.logger.error('Critical error in categoriesResource', e, 'CategoriesService');
        throw e;
      }
    }
  });
  
  private _updatingId = signal<string | null>(null);
  private _creating = signal(false);
  
  readonly categories = computed(() => this.categoriesResource.value() ?? []);
  
  readonly visibleCategories = computed(() => 
    this.categories().filter(c => c.visible !== false)
  );

  readonly totalCategories = computed(() => 
    this.categories().length
  );

  readonly loading = this.categoriesResource.isLoading;
  readonly updatingId = this._updatingId.asReadonly();
  readonly creating = this._creating.asReadonly();
  readonly error = computed(() => (this.categoriesResource.error() as any)?.message ?? null);

  readonly categories$ = toObservable(this.categories);
  readonly loading$ = toObservable(this.loading);
  readonly error$ = toObservable(this.error);

  reload() {
    this.categoriesResource.reload();
  }

  async createCategory(nombre: string, descripcion: string = ''): Promise<Category | null> {
    try {
      this._creating.set(true);

      const { data, error } = await this.supabase
        .from('categorias')
        .insert({ nombre, descripcion })
        .select()
        .single();

      if (error) throw error;

      this.toastService.show('Categoría creada correctamente', 'success');
      this.reload();
      return data as Category;
    } catch (err: any) {
      const msg = err.message || 'Error creating category';
      this.toastService.show(msg, 'error');
      this.logger.error('Error creating category', err, 'CategoriesService');
      return null;
    } finally {
      this._creating.set(false);
    }
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    try {
      this._updatingId.set(id);

      const { data, error } = await this.supabase
        .from('categorias')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      this.toastService.show('Categoría actualizada', 'success');
      this.reload();
      return data as Category;
    } catch (err: any) {
      const msg = err.message || 'Error updating category';
      this.toastService.show(msg, 'error');
      this.logger.error('Error updating category', err, 'CategoriesService');
      return null;
    } finally {
      this._updatingId.set(null);
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      this._updatingId.set(id);

      const { data: products, error: productsError } = await this.supabase
        .from('productos')
        .select('id, producto_fotos(url)')
        .eq('categoria_id', id);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        const allImages = products.flatMap((p: any) => p.producto_fotos || []);
        const deleteImagePromises = allImages.map((foto: any) => 
          this.productsService.deleteImage(foto.url).catch(err => this.logger.error('Error deleting image', err, 'CategoriesService'))
        );
        
        await Promise.allSettled(deleteImagePromises);

        for (const product of products) {
           await this.productsService.delete(product.id);
        }
      }

      const { error } = await this.supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.toastService.show('Categoría eliminada correctamente', 'success');
      this.reload();
      return true;

    } catch (err: any) {
      const msg = err.message || 'Error deleting category';
      this.toastService.show(msg, 'error');
      this.logger.error('Error deleting category', err, 'CategoriesService');
      return false;
    } finally {
      this._updatingId.set(null);
    }
  }

  getCategories(): Observable<Category[]> {
    return this.categories$;
  }

  updateCategoryName(id: string, nombre: string): Observable<Category> {
    return from(this.updateCategory(id, { nombre })).pipe(
      map(res => {
        if (!res) throw new Error(this.error() || 'Error updating category');
        return res;
      })
    );
  }
}
