import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '@shared/data-access/supabase.service';
import { LoggerService } from '@core/services/logger.service';
import { TicketData } from '../models/ticket.model';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private supabase = inject(SupabaseService).client;
  private logger = inject(LoggerService);
  private platformId = inject(PLATFORM_ID);

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
            propina,
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

  async printTicket(data?: TicketData) {
    if (!isPlatformBrowser(this.platformId)) return;

    // Si es cuenta y queremos PDF, usamos window.print() que permite guardar como PDF
    // En móviles nativos, usamos Share como respaldo si no hay impresora configurada
    const isNative = Capacitor.isNativePlatform();

    if (isNative && data) {
      try {
        let text = `Nordikos Grill House\n`;
        text += `Orden: #${data.order.numero_orden}\n`;
        text += `Fecha: ${new Date(data.order.fecha_creacion).toLocaleString()}\n`;
        text += `--------------------------------\n`;
        data.items.forEach(item => {
          text += `${item.cantidad}x ${item.nombre_producto} - $${item.precio_unitario}\n`;
          if (item.modificadores?.length) {
            item.modificadores.forEach(m => {
              text += `  + ${m.nombre_modificador}\n`;
            });
          }
        });
        text += `--------------------------------\n`;
        text += `Total: $${data.order.total}\n\n`;
        text += `¡Gracias por su compra!`;

        await Share.share({
          title: `Ticket Orden #${data.order.numero_orden}`,
          text: text,
          dialogTitle: 'Enviar o Guardar Ticket',
        });
        return;
      } catch (e) {
        this.logger.error('Error sharing ticket on native', e, 'TicketService');
      }
    }

    try {
      // Pequeño delay para asegurar renderizado antes de imprimir
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (e) {
      this.logger.error('Error triggering window.print()', e, 'TicketService');
    }
  }
}
