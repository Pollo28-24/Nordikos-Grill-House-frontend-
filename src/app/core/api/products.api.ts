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

  /** Helper para desenvolver promesas de Supabase y lanzar excepciones si hay error */
  private async unwrap<T = any>(query: PromiseLike<{ data: T | null; error: any }>): Promise<T | null> {
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async insert(product: any) {
    const { data, error } = await this.supabase.from('productos').insert(product).select().single();
    if (error) throw error;
    return { data, error: null };
  }

  async update(id: string | number, product: any) {
    return this.unwrap(
      this.supabase.from('productos').update(product).eq('id', this.parsedId(id))
    );
  }

  async delete(id: string | number) {
    return this.supabase.from('productos').delete().eq('id', this.parsedId(id));
  }

  async upsertOrder(products: any[]) {
    const promises = products.map(p => 
      this.unwrap(
        this.supabase.from('productos').update({ orden: p.orden, updated_at: p.updated_at }).eq('id', p.id)
      )
    );
    for (let i = 0; i < promises.length; i += 10) {
      await Promise.all(promises.slice(i, i + 10));
    }
  }

  // Related tables operations (returning promises for Promise.all batching)
  insertFotos(fotos: any[]) {
    return this.unwrap(
      this.supabase.from('producto_fotos').insert(fotos)
    );
  }

  deleteFotoByUrl(url: string) {
    return this.unwrap(
      this.supabase.from('producto_fotos').delete().eq('url', url)
    );
  }

  deleteFoto(id: number | string) {
    return this.unwrap(
      this.supabase.from('producto_fotos').delete().eq('id', this.parsedId(id))
    );
  }

  insertVariantes(variantes: any[]) {
    return this.unwrap(
      this.supabase.from('producto_variantes').insert(variantes)
    );
  }

  updateVariante(id: string | number, variante: any) {
    // Protección defensiva: excluir id o campos inmutables por si viajan en el payload
    const { id: _, created_at: __, ...updatePayload } = variante;
    return this.unwrap(
      this.supabase.from('producto_variantes').update(updatePayload).eq('id', this.parsedId(id))
    );
  }

  deleteVariantes(ids: string[]) {
    return this.unwrap(
      this.supabase.from('producto_variantes').delete().in('id', ids)
    );
  }

  async hasHistoricalVariantUsage(productId: string | number): Promise<boolean> {
    const parsed = this.parsedId(productId);
    const { count, error } = await this.supabase
      .from('order_request_items')
      .select('id', { count: 'exact', head: true })
      .eq('producto_id', parsed)
      .not('variante_id', 'is', null);

    if (error) throw error;
    return (count ?? 0) > 0;
  }

  private parsedId(id: string | number) {
    return !isNaN(Number(id)) ? Number(id) : id;
  }
}
