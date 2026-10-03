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
    referencias?: string | null;
    metodo_pago_id?: number | string | null;
    latitude?: number | null;
    longitude?: number | null;
    accuracy?: number | null;
    estado?: string;
  }) {
    const insertData: any = { ...request };
    // Si referencias no está definido o es vacío, no enviarlo para evitar errores en tablas sin migrar
    if (!insertData.referencias) {
      delete insertData.referencias;
    }

    const res = await this.supabase
      .from('order_requests')
      .insert(insertData)
      .select()
      .single();

    // Fallback defensivo si la columna aún no existe en el schema cache de Supabase
    if (res.error && res.error.message?.includes('referencias')) {
      delete insertData.referencias;
      return this.supabase
        .from('order_requests')
        .insert(insertData)
        .select()
        .single();
    }

    return res;
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

  getRequestsQuery(status?: string, withReferencias = true) {
    const fields = withReferencias
      ? `
        id, request_code, estado, total, nota_general, tipo_servicio_id, numero_mesa, direccion_entrega,
        referencias, metodo_pago_id, latitude, longitude, accuracy, motivo_rechazo, created_at,
        clientes (id, nombre, telefono, email, direccion),
        tipos_servicio (nombre),
        metodos_pago (id, nombre),
        order_request_items (
          id, cantidad, precio_unitario, nombre_producto, total, nota, producto_id, variante_id,
          order_request_item_modificadores (id, nombre_modificador, cantidad, precio_unitario)
        )
      `
      : `
        id, request_code, estado, total, nota_general, tipo_servicio_id, numero_mesa, direccion_entrega,
        metodo_pago_id, latitude, longitude, accuracy, motivo_rechazo, created_at,
        clientes (id, nombre, telefono, email, direccion),
        tipos_servicio (nombre),
        metodos_pago (id, nombre),
        order_request_items (
          id, cantidad, precio_unitario, nombre_producto, total, nota, producto_id, variante_id,
          order_request_item_modificadores (id, nombre_modificador, cantidad, precio_unitario)
        )
      `;

    let query = (this.supabase as any)
      .from('order_requests')
      .select(fields)
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

  getPaymentMethods() {
    return this.supabase
      .from('metodos_pago')
      .select('id, nombre')
      .order('id');
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
