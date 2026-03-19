import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { Modifier, ModifierCategory } from '../../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ModifiersService {
  private supabase = inject(SupabaseService).client;

  // STORES
  private _categories = signal<any[]>([]);
  private _modifiers = signal<any[]>([]);
  private _loading = signal(false);

  readonly categories = this._categories.asReadonly();
  readonly modifiers = this._modifiers.asReadonly();
  readonly loading = this._loading.asReadonly();

  constructor() {
    this.loadAll();
  }

  async loadAll() {
    this._loading.set(true);
    await Promise.all([
      this.loadCategories(),
      this.loadModifiers()
    ]);
    this._loading.set(false);
  }

  async loadCategories() {
    const { data, error } = await this.supabase
      .from('modificador_categorias')
      .select('*')
      .order('nombre');
    
    if (error) console.error('Error loading modifier categories:', error);
    if (data) this._categories.set(data);
  }

  async loadModifiers() {
    const { data, error } = await this.supabase
      .from('modificadores')
      .select(`
        *,
        modificador_categorias (nombre)
      `)
      .order('nombre');
    
    if (error) console.error('Error loading modifiers:', error);
    if (data) this._modifiers.set(data);
  }

  // CRUD CATEGORIES
  async createCategory(cat: Partial<ModifierCategory>) {
    const { data, error } = await this.supabase
      .from('modificador_categorias')
      .insert(cat)
      .select()
      .single();
    if (!error && data) {
      this._categories.update(prev => [...prev, data]);
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
      this._categories.update(prev => prev.map(c => c.id === id ? data : c));
    }
    return { data, error };
  }

  async deleteCategory(id: string | number) {
    const { error } = await this.supabase
      .from('modificador_categorias')
      .delete()
      .eq('id', id);
    if (!error) {
      this._categories.update(prev => prev.filter(c => c.id !== id));
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
      this._modifiers.update(prev => [...prev, data]);
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
      this._modifiers.update(prev => prev.map(m => m.id === id ? data : m));
    }
    return { data, error };
  }

  async deleteModifier(id: string | number) {
    const { error } = await this.supabase
      .from('modificadores')
      .delete()
      .eq('id', id);
    if (!error) {
      this._modifiers.update(prev => prev.filter(m => m.id !== id));
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
