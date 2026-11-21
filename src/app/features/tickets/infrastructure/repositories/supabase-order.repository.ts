import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@shared/data-access/supabase.service';
import { LoggerService } from '@core/services/logger.service';
import { PrintableOrderRepository } from '../../domain/ports/printable-order-repository.port';
import { PrintableOrder } from '../../domain/models/printable-order.model';
import { SupabaseOrderAssembler } from '../mappers/supabase-order-assembler';

@Injectable({
  providedIn: 'root'
})
export class SupabaseOrderRepository implements PrintableOrderRepository {
  private supabase = inject(SupabaseService).client;
  private logger = inject(LoggerService);

  async findById(orderId: number): Promise<PrintableOrder | null> {
    try {
      const [orderResult, itemsResult] = await Promise.all([
        this.supabase
          .from('orders')
          .select(`
            id,
            numero_orden,
            numero_mesa,
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
            nota,
            estado,
            order_item_modificadores (
              nombre_modificador,
              cantidad,
              precio_unitario
            )
          `)
          .eq('order_id', orderId)
      ]);

      if (orderResult.error) {
        this.logger.error('Error fetching order from Supabase', orderResult.error, 'SupabaseOrderRepository');
        throw orderResult.error;
      }
      if (itemsResult.error) {
        this.logger.error('Error fetching order items from Supabase', itemsResult.error, 'SupabaseOrderRepository');
        throw itemsResult.error;
      }

      return SupabaseOrderAssembler.toPrintableOrder(orderResult.data, itemsResult.data || []);
    } catch (error) {
      this.logger.error('Error retrieving PrintableOrder by order ID', error, 'SupabaseOrderRepository');
      return null;
    }
  }
}
