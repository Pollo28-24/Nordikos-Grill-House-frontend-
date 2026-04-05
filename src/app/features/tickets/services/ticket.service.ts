import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { LoggerService } from '../../../core/services/logger.service';
import { TicketData } from '../models/ticket.model';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private supabase = inject(SupabaseService).client;
  private logger = inject(LoggerService);

  async getTicketData(orderId: number): Promise<TicketData | null> {
    try {
      const [orderResult, itemsResult] = await Promise.all([
        this.supabase
          .from('orders')
          .select(`
            id,
            numero_orden,
            fecha_creacion,
            estado_pedido,
            estado_pago,
            total,
            provincia,
            nota_general,
            clientes (nombre, telefono),
            tipos_servicio (nombre)
          `)
          .eq('id', orderId)
          .single(),
        
        this.supabase
          .from('order_items')
          .select(`
            id,
            order_id,
            nombre_producto,
            cantidad,
            precio_unitario,
            total,
            order_item_modificadores (
              nombre_modificador,
              cantidad,
              precio_unitario
            )
          `)
          .eq('order_id', orderId)
      ]);

      if (orderResult.error) throw orderResult.error;
      if (itemsResult.error) throw itemsResult.error;

      const orderDataRaw = orderResult.data as any;
      const itemsDataRaw = itemsResult.data as any[];

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
          cliente: orderDataRaw.clientes,
          tipo_servicio: orderDataRaw.tipos_servicio?.nombre
        },
        items: itemsDataRaw.map(item => ({
          ...item,
          modificadores: item.order_item_modificadores || []
        }))
      };
    } catch (error) {
      this.logger.error('Error fetching ticket data', error, 'TicketService');
      return null;
    }
  }

  printTicket() {
    window.print();
  }
}
