import { Injectable, inject, signal, computed, PLATFORM_ID, resource } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { SupabaseService } from '../../shared/data-access/supabase.service';
import { ToastService } from './toast.service';
import { ProductsService } from './products.service';

// Domain Interfaces
export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  visible?: boolean;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

// Enterprise Type Safety
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

  // -----------------------------
  // DATA RESOURCE (Angular 20+)
  // -----------------------------
  
  private categoriesResource = resource({
    loader: async () => {
      const { data, error } = await this.supabase
        .from('categorias')
        .select('*, productos(count)')
        .order('nombre');

      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        ...row,
        products_count: row.productos?.[0]?.count ?? 0,
      })) as Category[];
    }
  });

  // -----------------------------
  // STATE (Signal First)
  // -----------------------------
  
  // Loading states
  private _updatingId = signal<string | null>(null); // Granular update loading
  private _creating = signal(false); // Creating loading
  
  // -----------------------------
  // PUBLIC READ-ONLY STATE
  // -----------------------------
  readonly categories = computed(() => this.categoriesResource.value() ?? []);
  
  // Computed Signals
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

  // -----------------------------
  // COMPATIBILITY
  // -----------------------------
  readonly categories$ = toObservable(this.categories);
  readonly loading$ = toObservable(this.loading);
  readonly error$ = toObservable(this.error);

  // -----------------------------
  // ACTIONS
  // -----------------------------

  reload() {
    this.categoriesResource.reload();
  }

  // -----------------------------
  // CREATE
  // -----------------------------
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
      return null;
    } finally {
      this._creating.set(false);
    }
  }

  // -----------------------------
  // UPDATE
  // -----------------------------
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category | null> {
    try {
      this._updatingId.set(id); // Granular loading

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
      return null;
    } finally {
      this._updatingId.set(null);
    }
  }

  // -----------------------------
  // DELETE
  // -----------------------------
  async deleteCategory(id: string): Promise<boolean> {
    try {
      this._updatingId.set(id);

      // 1. Fetch products to delete images
      const { data: products, error: productsError } = await this.supabase
        .from('productos')
        .select('id, producto_fotos(url)')
        .eq('categoria_id', id);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        // 2. Delete all images from storage
        const allImages = products.flatMap((p: any) => p.producto_fotos || []);
        const deleteImagePromises = allImages.map((foto: any) => 
          this.productsService.deleteImage(foto.url).catch(err => console.error('Error deleting image:', err))
        );
        
        await Promise.allSettled(deleteImagePromises);

        // 3. Delete products one by one to update ProductsService state
        for (const product of products) {
           await this.productsService.delete(product.id);
        }
      }

      // 4. Delete Category
      const { error } = await this.supabase
        .from('categorias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 5. Update Local State
      this.toastService.show('Categoría eliminada correctamente', 'success');
      this.reload();
      return true;

    } catch (err: any) {
      const msg = err.message || 'Error deleting category';
      this.toastService.show(msg, 'error');
      return false;
    } finally {
      this._updatingId.set(null);
    }
  }

  // ===============================
  // COMPATIBILITY METHODS
  // ===============================

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
