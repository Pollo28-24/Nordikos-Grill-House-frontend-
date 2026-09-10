import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@shared/data-access/supabase.service';

@Injectable({ providedIn: 'root' })
export class OrdersRequestsApi {
  private readonly supabase = inject(SupabaseService).client;

  async findClientByPhone(phone: string) {
    return this.supabase
      .from('clientes')
      .select('*')
      .eq('telefono', phone)
      .maybeSingle();
  }

  async createClient(client: { nombre: string; telefono: string; email?: string; direccion?: string }) {
    return this.supabase
      .from('clientes')
      .insert(client)
      .select()
      .single();
  }

  async updateClient(id: number | string, client: { nombre?: string; email?: string; direccion?: string }) {
    return this.supabase
      .from('clientes')
      .update(client)
      .eq('id', id)
      .select()
      .single();
  }

  async createOrderRequest(request: {
    cliente_id?: number | string | null;
    total: number;
    nota_general: string | null;
    tipo_servicio_id: number | string;
    numero_mesa?: string | null;
    direccion_entrega?: string | null;
    estado?: string;
  }) {
    return this.supabase
      .from('order_requests')
      .insert(request)
      .select()
      .single();
  }

  async insertRequestItems(items: any[]) {
    return this.supabase
      .from('order_request_items')
      .insert(items)
      .select();
  }

  async insertRequestItemModifiers(mods: any[]) {
    return this.supabase
      .from('order_request_item_modificadores')
      .insert(mods)
      .then();
  }

  getRequestsQuery(status?: string) {
    let query = this.supabase
      .from('order_requests')
      .select(`
        id, request_code, estado, total, nota_general, tipo_servicio_id, numero_mesa, direccion_entrega, motivo_rechazo, created_at,
        clientes (id, nombre, telefono, email, direccion),
        tipos_servicio (nombre),
        order_request_items (
          id, cantidad, precio_unitario, nombre_producto, total, nota, producto_id, variante_id,
          order_request_item_modificadores (id, nombre_modificador, cantidad, precio_unitario)
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('estado', status);
    }
    return query;
  }

  async acceptOrderRequest(requestId: number | string, paymentMethodId: number | string, shiftId: number | string | null) {
    return this.supabase.rpc('accept_order_request', {
      p_request_id: requestId,
      p_metodo_pago_id: paymentMethodId,
      p_turno_id: shiftId
    });
  }

  async rejectOrderRequest(requestId: number | string, reason: string) {
    return this.supabase
      .from('order_requests')
      .update({ estado: 'rejected', motivo_rechazo: reason })
      .eq('id', requestId);
  }

  getServiceTypes() {
    return this.supabase
      .from('tipos_servicio')
      .select('id, nombre')
      .order('id');
  }

  getRealtimeChannel() {
    return this.supabase.channel('order-requests-realtime');
  }

  removeRealtimeChannel(channel: any) {
    this.supabase.removeChannel(channel);
  }
}
