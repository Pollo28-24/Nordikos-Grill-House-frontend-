import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@shared/data-access/supabase.service';

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly supabase = inject(SupabaseService).client;

  getOrdersQuery(dateFilter?: { start: string; end: string }) {
    let query = this.supabase
      .from('orders')
      .select(`
        id, numero_orden, nota_general, fecha_creacion, fecha_cierre, total, 
        estado_pedido, estado_pago, metodo_pago_id, tipo_servicio_id, turno_id,
        clientes (nombre), tipos_servicio (nombre),
        order_items (
          id, cantidad, precio_unitario, nombre_producto, nota, producto_id,
          order_item_modificadores (id, nombre_modificador, cantidad, precio_unitario)
        )
      `)
      .order('fecha_creacion', { ascending: false });

    if (dateFilter) {
      query = query.gte('fecha_creacion', dateFilter.start).lte('fecha_creacion', dateFilter.end);
    } else {
      query = query.limit(100);
    }
    return query;
  }

  insertOrderItem(item: any) { 
    return this.supabase.from('order_items').insert(item).select().single(); 
  }
  
  insertOrderItemModifiers(mods: any[]) { 
    return this.supabase.from('order_item_modificadores').insert(mods).then(); 
  }
  
  getOrderTotal(orderId: number) { 
    return this.supabase.from('orders').select('total').eq('id', orderId).single(); 
  }
  
  updateOrderTotalAndNote(orderId: number, total: number, nota_general: string | null, propina: number) {
    return this.supabase.from('orders').update({ total, nota_general, propina }).eq('id', orderId).then();
  }

  insertTicket(ticket: any) { 
    return this.supabase.from('tickets').insert(ticket).then(); 
  }
  
  rpcCreateOrderV1(payload: any) { 
    return this.supabase.rpc('orders_create_v1', payload); 
  }
  
  updateOrderNote(orderId: number, nota: string) { 
    return this.supabase.from('orders').update({ nota_general: nota }).eq('id', orderId).then(); 
  }

  updateOrderStatus(orderId: number, status: string, closeDate: string | null) {
    return this.supabase.from('orders').update({ estado_pedido: status, fecha_cierre: closeDate }).eq('id', orderId);
  }

  updatePaymentStatus(orderId: number, status: string) {
    return this.supabase.from('orders').update({ estado_pago: status }).eq('id', orderId);
  }

  bulkUpdateOrderStatus(ids: number[], status: string, closeDate: string | null) {
    return this.supabase.from('orders').update({ estado_pedido: status, fecha_cierre: closeDate }).in('id', ids);
  }

  bulkUpdatePaymentStatus(ids: number[], status: string) {
    return this.supabase.from('orders').update({ estado_pago: status }).in('id', ids);
  }

  cancelOrder(orderId: number, nota_general: string, motivo_cancelacion?: string) {
    const updatePayload: any = { 
      estado_pedido: 'cancelado', 
      nota_general: nota_general,
      fecha_cierre: new Date().toISOString()
    };

    if (motivo_cancelacion) {
      updatePayload.motivo_cancelacion = motivo_cancelacion;
    }

    return this.supabase.from('orders')
      .update(updatePayload)
      .eq('id', orderId);
  }

  getServiceTypes() { 
    return this.supabase.from('tipos_servicio').select('id,nombre').order('id'); 
  }

  async getOrderById(id: string | number) {
    const { data: order, error: orderError } = await this.supabase.from('orders')
      .select(`*, clientes (nombre, telefono), tipos_servicio (nombre), metodos_pago (nombre), turnos (nombre)`)
      .eq('id', id).maybeSingle();

    if (orderError || !order) return { order: null, orderError, items: null, itemsError: null };

    const { data: items, error: itemsError } = await this.supabase.from('order_items')
      .select(`*, modificadores:order_item_modificadores(*)`)
      .eq('order_id', id);

    return { order, orderError, items, itemsError };
  }

  getRealtimeChannel() {
    return this.supabase.channel('orders-realtime');
  }

  removeRealtimeChannel(channel: any) {
    this.supabase.removeChannel(channel);
  }
}
