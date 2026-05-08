import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@shared/data-access/supabase.service';

@Injectable({ providedIn: 'root' })
export class ProductsApi {
  private readonly supabase = inject(SupabaseService).client;

  async getAll() {
    return this.supabase
      .from('productos')
      .select(`
        *,
        producto_variantes(*),
        producto_fotos(*),
        producto_modificadores(
          modificador_id,
          modificadores(*, modificador_categorias(*))
        )
      `)
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true });
  }

  async getById(id: string | number) {
    return this.supabase
      .from('productos')
      .select('*, producto_variantes(*), producto_fotos(*)')
      .eq('id', this.parsedId(id))
      .single();
  }

  async insert(product: any) {
    return this.supabase.from('productos').insert(product).select().single();
  }

  async update(id: string | number, product: any) {
    return this.supabase.from('productos').update(product).eq('id', this.parsedId(id)).then();
  }

  async delete(id: string | number) {
    return this.supabase.from('productos').delete().eq('id', this.parsedId(id));
  }

  async upsertOrder(products: any[]) {
    const promises = products.map(p => 
      this.supabase.from('productos').update({ orden: p.orden, updated_at: p.updated_at }).eq('id', p.id)
    );
    for (let i = 0; i < promises.length; i += 10) {
      await Promise.all(promises.slice(i, i + 10));
    }
  }

  // Related tables operations (returning promises for Promise.all batching)
  insertFotos(fotos: any[]) {
    return this.supabase.from('producto_fotos').insert(fotos).then();
  }

  deleteFotoByUrl(url: string) {
    return this.supabase.from('producto_fotos').delete().eq('url', url).then();
  }

  deleteFoto(id: number | string) {
    return this.supabase.from('producto_fotos').delete().eq('id', this.parsedId(id)).then();
  }

  insertVariantes(variantes: any[]) {
    return this.supabase.from('producto_variantes').insert(variantes).then();
  }

  updateVariante(id: string | number, variante: any) {
    return this.supabase.from('producto_variantes').update(variante).eq('id', this.parsedId(id)).then();
  }

  deleteVariantes(ids: string[]) {
    return this.supabase.from('producto_variantes').delete().in('id', ids).then();
  }

  private parsedId(id: string | number) {
    return !isNaN(Number(id)) ? Number(id) : id;
  }
}
