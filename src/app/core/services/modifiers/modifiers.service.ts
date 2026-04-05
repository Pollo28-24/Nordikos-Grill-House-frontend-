import { Injectable, inject, computed, resource, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { LoggerService } from '../logger.service';
import { Modifier, ModifierCategory } from '../../models/product.model';

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
      return data || [];
    }
  });

  private modifiersResource = resource({
    loader: async () => {
      if (!this.isBrowser()) return [];
      
      const { data, error } = await this.supabase
        .from('modificadores')
        .select(`
          *,
          modificador_categorias (nombre)
        `)
        .order('nombre');
      
      if (error) {
        this.logger.error('Error loading modifiers', error, 'ModifiersService');
        throw error;
      }
      return data || [];
    }
  });

  readonly categories = computed(() => this.categoriesResource.value() ?? []);
  readonly modifiers = computed(() => this.modifiersResource.value() ?? []);
  readonly loading = computed(() => this.categoriesResource.isLoading() || this.modifiersResource.isLoading());

  reloadAll() {
    this.categoriesResource.reload();
    this.modifiersResource.reload();
  }

  async createCategory(cat: Partial<ModifierCategory>) {
    const { data, error } = await this.supabase
      .from('modificador_categorias')
      .insert(cat)
      .select()
      .single();
    if (!error && data) {
      this.categoriesResource.reload();
    }
    if (error) {
      this.logger.error('Error creating modifier category', error, 'ModifiersService');
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
    if (error) {
      this.logger.error('Error creating modifier', error, 'ModifiersService');
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
    if (error) {
      this.logger.error('Error updating modifier', error, 'ModifiersService');
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
    if (error) {
      this.logger.error('Error deleting modifier', error, 'ModifiersService');
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
