import { Injectable, inject, computed, resource, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { LoggerService } from '../logger.service';
import { Modifier, ModifierCategory, CreateModifierDto, UpdateModifierDto } from '../../models/product.model';
import { mapModifierCategory } from '../products.service';

@Injectable({
  providedIn: 'root'
})
export class ModifiersService {
  private supabase = inject(SupabaseService).client;
  private platformId = inject(PLATFORM_ID);
  private logger = inject(LoggerService);

  private isBrowser = () => isPlatformBrowser(this.platformId);
  
  private categoriesResource = resource({
    loader: async () => {
      if (!this.isBrowser()) return [];
      
      const { data, error } = await this.supabase
        .from('modificador_categorias')
        .select('*')
        .order('nombre');
      
      if (error) {
        this.logger.error('Error loading modifier categories', error, 'ModifiersService');
        throw error;
      }
      return (data || []).map((cat: any, idx: number) => mapModifierCategory(cat, idx));
    }
  });

  private modifiersResource = resource({
    loader: async () => {
      if (!this.isBrowser()) return [];
      
      const { data, error } = await this.supabase
        .from('modificadores')
        .select(`
          *,
          modificador_categorias (*)
        `)
        .order('nombre');
      
      if (error) {
        this.logger.error('Error loading modifiers', error, 'ModifiersService');
        throw error;
      }
      return (data || []).map((m: any, idx: number) => ({
        ...m,
        disponible: m.disponible !== false,
        visible: m.visible !== false,
        modificador_categorias: m.modificador_categorias ? mapModifierCategory(m.modificador_categorias, idx) : undefined
      })) as Modifier[];
    }
  });

  readonly categories = computed(() => this.categoriesResource.value() ?? []);
  readonly modifiers = computed(() => this.modifiersResource.value() ?? []);
  readonly loading = computed(() => this.categoriesResource.isLoading() || this.modifiersResource.isLoading());
  readonly initialLoading = computed(() => 
    (!this.categoriesResource.hasValue() && this.categoriesResource.isLoading()) ||
    (!this.modifiersResource.hasValue() && this.modifiersResource.isLoading())
  );

  reloadAll() {
    this.categoriesResource.reload();
    this.modifiersResource.reload();
  }

  async createCategory(cat: Partial<ModifierCategory>) {
    let { data, error } = await this.supabase
      .from('modificador_categorias')
      .insert(cat)
      .select()
      .single();

    // Fallback defensivo si las columnas de reglas aún no existen en la BD de Supabase
    if (error && (error.message?.includes('column') || error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      const basicCat = {
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        visible: cat.visible
      };
      const fallback = await this.supabase
        .from('modificador_categorias')
        .insert(basicCat)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (!error && data) {
      this.categoriesResource.reload();
    }
    if (error) {
      this.logger.error('Error creating modifier category', error, 'ModifiersService');
    }
    return { data, error };
  }

  async updateCategory(id: string | number, cat: Partial<ModifierCategory>) {
    let { data, error } = await this.supabase
      .from('modificador_categorias')
      .update(cat)
      .eq('id', id)
      .select()
      .single();

    // Fallback defensivo si las columnas de reglas aún no existen en la BD de Supabase
    if (error && (error.message?.includes('column') || error.message?.includes('schema cache') || error.code === 'PGRST204')) {
      const basicCat = {
        nombre: cat.nombre,
        descripcion: cat.descripcion,
        visible: cat.visible
      };
      const fallback = await this.supabase
        .from('modificador_categorias')
        .update(basicCat)
        .eq('id', id)
        .select()
        .single();
      data = fallback.data;
      error = fallback.error;
    }

    if (!error && data) {
      this.categoriesResource.reload();
    }
    if (error) {
      this.logger.error('Error updating modifier category', error, 'ModifiersService');
    }
    return { data, error };
  }

  async deleteCategory(id: string | number) {
    const { error } = await this.supabase
      .from('modificador_categorias')
      .delete()
      .eq('id', id);
    if (!error) {
      this.categoriesResource.reload();
    }
    if (error) {
      this.logger.error('Error deleting modifier category', error, 'ModifiersService');
    }
    return { error };
  }

  /**
   * Actualización optimista de flags (visible / disponible) con rollback automático en caso de error.
   * Evita recargar toda la lista o parpadeos molestos de pantalla.
   */
  async toggleModifierStatus(id: string | number, field: 'visible' | 'disponible', value: boolean) {
    const prev = this.modifiersResource.value() ?? [];

    // Actualización inmediata en UI
    this.modifiersResource.update(list =>
      (list ?? []).map(m => m.id === id ? { ...m, [field]: value } : m)
    );

    const { error } = await this.supabase
      .from('modificadores')
      .update({ [field]: value })
      .eq('id', id);

    if (error) {
      this.logger.error(`Error toggling modifier ${field}`, error, 'ModifiersService');
      // Rollback al estado anterior si falló
      this.modifiersResource.set(prev);
      return { error };
    }

    return { error: null };
  }

  async createModifier(mod: CreateModifierDto) {
    const { data, error } = await this.supabase
      .from('modificadores')
      .insert(mod)
      .select(`
        *,
        modificador_categorias (*)
      `)
      .single();

    if (!error && data) {
      const createdItem: Modifier = {
        ...data,
        disponible: data.disponible !== false,
        visible: data.visible !== false,
        modificador_categorias: data.modificador_categorias ? mapModifierCategory(data.modificador_categorias) : undefined
      };
      // Actualizamos la señal localmente sin recargar toda la consulta
      this.modifiersResource.update(list => {
        const current = list ?? [];
        return [...current, createdItem].sort((a, b) => a.nombre.localeCompare(b.nombre));
      });
    }
    if (error) {
      this.logger.error('Error creating modifier', error, 'ModifiersService');
    }
    return { data, error };
  }

  async updateModifier(id: string | number, mod: UpdateModifierDto) {
    const { data, error } = await this.supabase
      .from('modificadores')
      .update(mod)
      .eq('id', id)
      .select(`
        *,
        modificador_categorias (*)
      `)
      .single();

    if (!error && data) {
      const updatedItem: Modifier = {
        ...data,
        disponible: data.disponible !== false,
        visible: data.visible !== false,
        modificador_categorias: data.modificador_categorias ? mapModifierCategory(data.modificador_categorias) : undefined
      };
      // Actualizamos la señal localmente sin destruir la vista ni los scrolls
      this.modifiersResource.update(list =>
        (list ?? []).map(m => m.id === id ? updatedItem : m).sort((a, b) => a.nombre.localeCompare(b.nombre))
      );
    }
    if (error) {
      this.logger.error('Error updating modifier', error, 'ModifiersService');
    }
    return { data, error };
  }

  async deleteModifier(id: string | number) {
    const prev = this.modifiersResource.value() ?? [];

    // Eliminación optimista
    this.modifiersResource.update(list => (list ?? []).filter(m => m.id !== id));

    const { error } = await this.supabase
      .from('modificadores')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error('Error deleting modifier', error, 'ModifiersService');
      // Rollback
      this.modifiersResource.set(prev);
    }
    return { error };
  }

  async assignToProduct(productId: string | number, modifierId: string | number, maxQty: number = 1) {
    const { data, error } = await this.supabase
      .from('producto_modificadores')
      .upsert({
        producto_id: productId,
        modificador_id: modifierId,
        cantidad_maxima: maxQty
      })
      .select();
    if (error) {
      this.logger.error('Error assigning modifier to product', error, 'ModifiersService');
    }
    return { data, error };
  }

  async removeFromProduct(productId: string | number, modifierId: string | number) {
    const { error } = await this.supabase
      .from('producto_modificadores')
      .delete()
      .match({ producto_id: productId, modificador_id: modifierId });
    if (error) {
      this.logger.error('Error removing modifier from product', error, 'ModifiersService');
    }
    return { error };
  }

  async getProductModifiers(productId: string | number) {
    const { data, error } = await this.supabase
      .from('producto_modificadores')
      .select('modificador_id, cantidad_maxima')
      .eq('producto_id', productId);
    return { data, error };
  }

  async getModifierAssignments(modifierId: string | number) {
    const { data, error } = await this.supabase
      .from('producto_modificadores')
      .select('producto_id')
      .eq('modificador_id', modifierId);
    return { data, error };
  }
}
