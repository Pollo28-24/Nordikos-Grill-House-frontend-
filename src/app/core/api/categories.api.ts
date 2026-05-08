import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@shared/data-access/supabase.service';
import { Category } from '@core/models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoriesApi {
  private readonly supabase = inject(SupabaseService).client;

  async getAll() {
    return this.supabase
      .from('categorias')
      .select('*, productos(count)')
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });
  }

  async create(nombre: string, descripcion: string) {
    return this.supabase
      .from('categorias')
      .insert({ nombre, descripcion })
      .select()
      .single();
  }

  async update(id: string | number, updates: Partial<Category>) {
    return this.supabase
      .from('categorias')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', this.parsedId(id))
      .select('*')
      .single();
  }

  async upsertOrder(categories: Partial<Category>[]) {
    // Usamos actualizaciones concurrentes en lugar de upsert para no requerir todas las columnas NOT NULL
    const promises = categories.map(c => 
      this.supabase.from('categorias').update({ orden: c.orden, updated_at: c.updated_at }).eq('id', c.id)
    );
    for (let i = 0; i < promises.length; i += 10) {
      await Promise.all(promises.slice(i, i + 10));
    }
  }

  async delete(id: string | number) {
    return this.supabase
      .from('categorias')
      .delete()
      .eq('id', this.parsedId(id));
  }

  private parsedId(id: string | number) {
    return !isNaN(Number(id)) ? Number(id) : id;
  }
}
