import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { TicketData } from '../models/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private supabase = inject(SupabaseService).client;

  async getTicketData(orderId: number): Promise<TicketData | null> {
    try {
      // 1. Obtener la orden con información de cliente y tipo de servicio
      const { data: orderData, error: orderError } = await this.supabase
        .from('orders')
        .select(`
          id,
          numero_orden,
          fecha_creacion,
          estado_pedido,
          estado_pago,
          total,
          propina,
          nota_general,
          clientes (nombre, telefono),
          tipos_servicio (nombre)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // 2. Obtener los items de la orden
      const { data: itemsData, error: itemsError } = await this.supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          nombre_producto,
          cantidad,
          precio_unitario,
          total
        `)
        .eq('order_id', orderId);

      if (itemsError) throw itemsError;

      // 3. Obtener los modificadores de cada item
      const itemsWithModifiers = await Promise.all(
        (itemsData || []).map(async (item: any) => {
          const { data: modsData, error: modsError } = await this.supabase
            .from('order_item_modificadores')
            .select(`
              nombre_modificador,
              cantidad,
              precio_unitario
            `)
            .eq('order_item_id', item.id);

          if (modsError) console.error('Error fetching modifiers for item', item.id, modsError);
          
          return {
            ...item,
            modificadores: modsData || []
          };
        })
      );

      const orderDataRaw = orderData as any;
      return {
        order: {
          id: orderDataRaw.id,
          numero_orden: orderDataRaw.numero_orden,
          fecha_creacion: orderDataRaw.fecha_creacion,
          estado_pedido: orderDataRaw.estado_pedido,
          estado_pago: orderDataRaw.estado_pago,
          total: Number(orderDataRaw.total || 0),
          propina: Number(orderDataRaw.propina || 0),
          nota_general: orderDataRaw.nota_general,
          cliente: Array.isArray(orderDataRaw.clientes) ? orderDataRaw.clientes[0] : orderDataRaw.clientes,
          tipo_servicio: Array.isArray(orderDataRaw.tipos_servicio) ? orderDataRaw.tipos_servicio[0]?.nombre : orderDataRaw.tipos_servicio?.nombre
        },
        items: itemsWithModifiers
      };
    } catch (error) {
      console.error('Error fetching ticket data:', error);
      return null;
    }
  }

  printTicket() {
    window.print();
  }
}
