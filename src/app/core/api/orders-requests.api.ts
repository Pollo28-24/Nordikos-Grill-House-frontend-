import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@shared/data-access/supabase.service';

export interface CreatePublicOrderRequestRpcParams {
  p_client_info: {
    nombre?: string | null;
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
  };
  p_tipo_servicio_id: number;
  p_numero_mesa: string | null;
  p_direccion_entrega: string | null;
  p_referencias: string | null;
  p_nota_general: string | null;
  p_metodo_pago_id: number | null;
  p_location: { latitude: number; longitude: number; accuracy?: number } | null;
  p_items: Array<{
    producto_id: number | null;
    variante_id: number | null;
    nombre_producto: string;
    cantidad: number;
    nota: string | null;
    modificadores: Array<{
      modificador_id: number | null;
      nombre_modificador: string;
      cantidad: number;
      precio_unitario: number;
    }>;
  }>;
}

export interface CreatePublicOrderRequestRpcResponse {
  status: 'success' | 'error';
  request_id?: number;
  request_code?: string;
  total?: number;
  error_code?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class OrdersRequestsApi {
  private readonly supabase = inject(SupabaseService).client;

  async createPublicOrderRequest(params: CreatePublicOrderRequestRpcParams) {
    return this.supabase.rpc('create_public_order_request_v1', params);
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
