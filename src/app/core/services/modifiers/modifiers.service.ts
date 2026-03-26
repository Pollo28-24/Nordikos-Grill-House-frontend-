import { Injectable, inject, signal, computed, resource, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { Modifier, ModifierCategory } from '../../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ModifiersService {
  private supabase = inject(SupabaseService).client;
  private platformId = inject(PLATFORM_ID);

  // DATA RESOURCES (Angular 20+)
  
  private categoriesResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      const { data, error } = await this.supabase
        .from('modificador_categorias')
        .select('*')
        .order('nombre');
      if (error) throw error;
      return data || [];
    }
  });

  private modifiersResource = resource({
    loader: async () => {
      if (!isPlatformBrowser(this.platformId)) return [];
      const { data, error } = await this.supabase
        .from('modificadores')
        .select(`
          *,
          modificador_categorias (nombre)
        `)
        .order('nombre');
      if (error) throw error;
      return data || [];
    }
  });

  // STORES
  readonly categories = computed(() => this.categoriesResource.value() ?? []);
  readonly modifiers = computed(() => this.modifiersResource.value() ?? []);
  readonly loading = computed(() => this.categoriesResource.isLoading() || this.modifiersResource.isLoading());

  reloadAll() {
    this.categoriesResource.reload();
    this.modifiersResource.reload();
  }

  // CRUD CATEGORIES
  async createCategory(cat: Partial<ModifierCategory>) {
    const { data, error } = await this.supabase
      .from('modificador_categorias')
      .insert(cat)
      .select()
      .single();
    if (!error && data) {
      this.categoriesResource.reload();
    }
    return { data, error };
  }

  async updateCategory(id: string | number, cat: Partial<ModifierCategory>) {
    const { data, error } = await this.supabase
      .from('modificador_categorias')
      .update(cat)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      this.categoriesResource.reload();
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
    return { error };
  }

  // CRUD MODIFIERS
  async createModifier(mod: Partial<Modifier>) {
    const { data, error } = await this.supabase
      .from('modificadores')
      .insert(mod)
      .select(`
        *,
        modificador_categorias (nombre)
      `)
      .single();
    if (!error && data) {
      this.modifiersResource.reload();
    }
    return { data, error };
  }

  async updateModifier(id: string | number, mod: Partial<Modifier>) {
    const { data, error } = await this.supabase
      .from('modificadores')
      .update(mod)
      .eq('id', id)
      .select(`
        *,
        modificador_categorias (nombre)
      `)
      .single();
    if (!error && data) {
      this.modifiersResource.reload();
    }
    return { data, error };
  }

  async deleteModifier(id: string | number) {
    const { error } = await this.supabase
      .from('modificadores')
      .delete()
      .eq('id', id);
    if (!error) {
      this.modifiersResource.reload();
    }
    return { error };
  }

  // ASSIGNMENTS
  async assignToProduct(productId: string | number, modifierId: string | number, maxQty: number = 1) {
    const { data, error } = await this.supabase
      .from('producto_modificadores')
      .upsert({
        producto_id: productId,
        modificador_id: modifierId,
        cantidad_maxima: maxQty
      })
      .select();
    return { data, error };
  }

  async removeFromProduct(productId: string | number, modifierId: string | number) {
    const { error } = await this.supabase
      .from('producto_modificadores')
      .delete()
      .match({ producto_id: productId, modificador_id: modifierId });
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
