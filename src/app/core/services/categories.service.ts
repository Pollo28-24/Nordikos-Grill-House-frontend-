import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
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
  // STATE (Signal First)
  // -----------------------------
  private _categories = signal<Category[]>([]);
  
  // Loading states
  private _loadingList = signal(false); // Global list loading
  private _updatingId = signal<string | null>(null); // Granular update loading
  private _creating = signal(false); // Creating loading
  
  private _error = signal<string | null>(null);
  private _initialized = signal(false);

  // -----------------------------
  // PUBLIC READ-ONLY STATE
  // -----------------------------
  readonly categories = this._categories.asReadonly();
  
  // Computed Signals
  readonly visibleCategories = computed(() => 
    this._categories().filter(c => c.visible !== false)
  );

  readonly totalCategories = computed(() => 
    this._categories().length
  );

  readonly loading = this._loadingList.asReadonly();
  readonly updatingId = this._updatingId.asReadonly();
  readonly creating = this._creating.asReadonly();
  readonly error = this._error.asReadonly();

  // -----------------------------
  // COMPATIBILITY
  // -----------------------------
  readonly categories$ = toObservable(this.categories);
  readonly loading$ = toObservable(this.loading);
  readonly error$ = toObservable(this.error);

  constructor() {
    this.init();
  }

  private async init() {
    // Prevent SSR from fetching data
    if (!isPlatformBrowser(this.platformId)) return;
    
    // Prevent double fetch if already initialized OR if we have data
    if (this._initialized() || this._categories().length > 0) return;
    
    this._initialized.set(true);
    await this.loadCategories();
  }

  async loadCategories() {
    try {
      this._loadingList.set(true);
      this._error.set(null);

      const { data, error } = await this.supabase
        .from('categorias')
        .select('*, productos(count)');

      if (error) throw error;

      if (data) {
        // Safe typing with enterprise pattern
        const categories = (data as unknown as CategoryWithCount[]).map((category) => ({
          ...category,
          products_count: (Array.isArray(category.productos) && category.productos.length > 0) 
            ? category.productos[0].count 
            : 0,
        }));
        
        // Clean up internal structure before setting state
        const cleanCategories: Category[] = categories.map(({ productos, ...rest }) => rest);
        
        this._categories.set(cleanCategories);
      }
    } catch (err: any) {
      const msg = err.message || 'Error loading categories';
      this._error.set(msg);
      this.toastService.show(msg, 'error');
      console.error('Error loading categories:', err);
    } finally {
      this._loadingList.set(false);
    }
  }

  // -----------------------------
  // CREATE
  // -----------------------------
  async createCategory(nombre: string, descripcion: string = ''): Promise<Category | null> {
    try {
      this._creating.set(true);
      this._error.set(null);

      const { data, error } = await this.supabase
        .from('categorias')
        .insert({ nombre, descripcion })
        .select()
        .single();

      if (error) throw error;

      const newCategory = data as Category;
      // Add count property for consistency
      const categoryWithCount: Category = { ...newCategory, products_count: 0 };
      
      this._categories.update(prev => [categoryWithCount, ...prev]);
      this.toastService.show('Categoría creada correctamente', 'success');
      return categoryWithCount;
    } catch (err: any) {
      const msg = err.message || 'Error creating category';
      this._error.set(msg);
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
      this._error.set(null);

      const { data, error } = await this.supabase
        .from('categorias')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      const updatedCategory = data as Category;
      
      // Optimistic update of local state
      this._categories.update(prev => 
        prev.map(c => c.id === id ? { ...c, ...updatedCategory, products_count: c.products_count } : c)
      );

      return updatedCategory;
    } catch (err: any) {
      const msg = err.message || 'Error updating category';
      this._error.set(msg);
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
      this._error.set(null);

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
      this._categories.update(prev => prev.filter(c => c.id !== id));
      this.toastService.show('Categoría eliminada correctamente', 'success');
      return true;

    } catch (err: any) {
      const msg = err.message || 'Error deleting category';
      this._error.set(msg);
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
