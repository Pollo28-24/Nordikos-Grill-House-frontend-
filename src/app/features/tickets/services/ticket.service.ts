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

    const isNative = Capacitor.isNativePlatform();

    if (isNative && data) {
      try {
        const text = this.generateTicketText(data);
        await Share.share({
          title: `Ticket Orden #${data.order.numero_orden || data.order.id}`,
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

  generateTicketText(data: TicketData): string {
    let text = `🍽️ NORDIKOS GRILL HOUSE 🍽️\n`;
    text += `-----------------------------------------\n`;
    text += `Orden: #${data.order.numero_orden || data.order.id}\n`;
    if (data.order.tipo_servicio) {
      text += `Servicio: ${data.order.tipo_servicio}\n`;
    }
    const fecha = new Date(data.order.fecha_creacion);
    text += `Fecha: ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `-----------------------------------------\n`;
    
    if (data.order.cliente) {
      text += `Cliente: ${data.order.cliente.nombre}\n`;
      if (data.order.cliente.telefono) {
        text += `Tel: ${data.order.cliente.telefono}\n`;
      }
      text += `-----------------------------------------\n`;
    }
    
    text += `DETALLE DEL PEDIDO:\n`;
    data.items.forEach(item => {
      const precioTotal = item.precio_unitario * item.cantidad;
      let line = `${item.cantidad}x ${item.nombre_producto}`;
      const spaces = 41 - line.length - (`$${precioTotal.toFixed(2)}`).length;
      const pad = spaces > 0 ? ' '.repeat(spaces) : ' ';
      text += `${line}${pad}$${precioTotal.toFixed(2)}\n`;
      
      if (item.modificadores?.length) {
        item.modificadores.forEach(m => {
          const modTotal = m.precio_unitario * m.cantidad;
          let mLine = `   + ${m.nombre_modificador}`;
          if (modTotal > 0) {
            const mSpaces = 41 - mLine.length - (`$${modTotal.toFixed(2)}`).length;
            const mPad = mSpaces > 0 ? ' '.repeat(mSpaces) : ' ';
            text += `${mLine}${mPad}$${modTotal.toFixed(2)}\n`;
          } else {
            text += `${mLine}\n`;
          }
        });
      }
      
      if (item.nota) {
        text += `   (Nota: ${item.nota})\n`;
      }
    });
    
    text += `-----------------------------------------\n`;
    
    const subtotal = data.order.total - (data.order.propina || 0);
    const subtotalStr = `$${subtotal.toFixed(2)}`;
    let subtotalLine = `Subtotal:`;
    const subSpaces = 41 - subtotalLine.length - subtotalStr.length;
    text += `${subtotalLine}${' '.repeat(subSpaces > 0 ? subSpaces : 1)}${subtotalStr}\n`;
    
    if (data.order.propina) {
      const propinaStr = `$${data.order.propina.toFixed(2)}`;
      let propinaLine = `Propina:`;
      const propSpaces = 41 - propinaLine.length - propinaStr.length;
      text += `${propinaLine}${' '.repeat(propSpaces > 0 ? propSpaces : 1)}${propinaStr}\n`;
    }
    
    text += `-----------------------------------------\n`;
    const totalStr = `$${data.order.total.toFixed(2)}`;
    let totalLine = `TOTAL:`;
    const totSpaces = 41 - totalLine.length - totalStr.length;
    text += `${totalLine}${' '.repeat(totSpaces > 0 ? totSpaces : 1)}${totalStr}\n`;
    text += `-----------------------------------------\n`;
    text += `¡Gracias por tu visita!\n`;
    text += `Sabor que te transporta al norte.`;
    
    return text;
  }

  async shareOrCopyTicket(data: TicketData): Promise<'shared' | 'copied' | 'failed'> {
    const isNative = Capacitor.isNativePlatform();
    const text = this.generateTicketText(data);
    const title = `Ticket Orden #${data.order.numero_orden || data.order.id}`;

    if (isNative) {
      try {
        await Share.share({
          title: title,
          text: text,
          dialogTitle: 'Enviar o Guardar Ticket',
        });
        return 'shared';
      } catch (e) {
        this.logger.error('Error sharing ticket on native', e, 'TicketService');
        return 'failed';
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
        });
        return 'shared';
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return 'shared';
        }
        this.logger.warn('Error sharing ticket via navigator.share, falling back to clipboard', e, 'TicketService');
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return 'copied';
      } catch (e) {
        this.logger.error('Error copying ticket to clipboard', e, 'TicketService');
        return 'failed';
      }
    }

    return 'failed';
  }
}
