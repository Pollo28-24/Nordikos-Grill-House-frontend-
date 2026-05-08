import { Injectable, inject, signal, computed, PLATFORM_ID, resource } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ToastService } from './toast.service';
import { ProductsService } from './products.service';
import { LoggerService } from './logger.service';
import { CategoriesApi } from '@core/api/categories.api';
import { Category } from '@core/models/category.model';
import { SupabaseService } from '@shared/data-access/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class CategoriesService { // Actúa como el STATE / FACADE
  private readonly api = inject(CategoriesApi);
  private readonly supabase = inject(SupabaseService).client; // temporalmente para queries cross-domain
  private readonly toastService = inject(ToastService);
  private readonly productsService = inject(ProductsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);

  private readonly categoriesResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      try {
        const { data, error } = await this.api.getAll();

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
  
  private readonly _updatingId = signal<string | null>(null);
  private readonly _creating = signal(false);
  
  // PUBLIC STATE (Signals & Computeds)
  readonly categories = computed(() => this.categoriesResource.value() ?? []);
  readonly visibleCategories = computed(() => this.categories().filter(c => c.visible !== false));
  readonly totalCategories = computed(() => this.categories().length);

  readonly loading = this.categoriesResource.isLoading;
  readonly updatingId = this._updatingId.asReadonly();
  readonly creating = this._creating.asReadonly();
  readonly error = computed(() => (this.categoriesResource.error() as any)?.message ?? null);

  readonly categories$ = toObservable(this.categories);
  readonly loading$ = toObservable(this.loading);
  readonly error$ = toObservable(this.error);

  // ACTIONS
  reload() {
    this.categoriesResource.reload();
  }

  async createCategory(nombre: string, descripcion: string = ''): Promise<Category | null> {
    try {
      this._creating.set(true);

      const { data, error } = await this.api.create(nombre, descripcion);
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

      const { data, error } = await this.api.update(id, updates);
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

  async updateCategoriesOrder(categories: Category[]): Promise<void> {
    try {
      this._creating.set(true);

      // Preparamos los datos mínimos para el UPSERT masivo
      const itemsToUpsert = categories.map((c, i) => ({
        id: !isNaN(Number(c.id)) ? Number(c.id) : c.id,
        orden: i + 1,
        updated_at: new Date().toISOString()
      }));

      // Optimistic update: mutamos la caché local inmediatamente para que la UI se sienta instantánea
      this.categoriesResource.update(current => {
        if (!current) return current;
        const currentMapped = new Map(current.map(c => [String(c.id), c]));
        return itemsToUpsert.map(u => ({ ...currentMapped.get(String(u.id)), ...u })) as Category[];
      });

      // 1 solo llamado a BD mediante UPSERT masivo en vez de 20 updates concurrentes
      try {
        await this.api.upsertOrder(itemsToUpsert as Partial<Category>[]);
      } catch (error) {
        this.reload(); // Rollback en caso de error
        throw error;
      }

    } catch (err: any) {
      this.logger.error('Error updating categories order', err, 'CategoriesService');
      this.toastService.show('Error al guardar el orden', 'error');
    } finally {
      this._creating.set(false);
    }
  }

  async deleteCategory(id: string): Promise<boolean> {
    try {
      this._updatingId.set(id);

      // Cross-domain fetch para borrar productos en cascada si no hay triggers en BD
      const { data: products, error: productsError } = await this.supabase
        .from('productos')
        .select('id')
        .eq('categoria_id', id);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        const deletePromises = products.map((product: any) => this.productsService.delete(product.id));
        await Promise.all(deletePromises);
      }

      // 1 solo llamado a BD para borrar categoría
      const { error } = await this.api.delete(id);
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
        if (!res) throw new Error((this.categoriesResource.error() as any)?.message || 'Error updating category');
        return res;
      })
    );
  }
}
