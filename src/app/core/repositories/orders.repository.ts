import { Injectable, inject } from '@angular/core';
import { OrdersApi } from '@core/api/orders.api';
import { SupabaseService } from '@shared/data-access/supabase.service';
import { LoggerService } from '@core/services/logger.service';
import {
  ItemAdjustmentReason,
  OrderItemSnapshot,
  OrderSnapshot,
  ServiceTypeCode,
  SyncStatus,
} from '@core/domain/order/order.types';
import { OrderAggregate } from '@core/domain/order/order.aggregate';

export interface RepositoryExecutionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  syncStatus: SyncStatus;
}

@Injectable({ providedIn: 'root' })
export class OrdersRepository {
  private readonly api = inject(OrdersApi);
  private readonly supabase = inject(SupabaseService).client;
  private readonly logger = inject(LoggerService);

  /**
   * Obtiene la orden por ID y la mapea a un OrderAggregate de dominio puro.
   */
  async getOrderAggregate(orderId: number | string): Promise<{ aggregate: OrderAggregate | null; error?: string }> {
    try {
      const { order, orderError, items, itemsError } = await this.api.getOrderById(orderId);

      if (orderError) {
        this.logger.error('Error al obtener orden de Supabase', orderError, 'OrdersRepository');
        return { aggregate: null, error: orderError.message };
      }

      if (!order) {
        return { aggregate: null, error: 'Orden no encontrada' };
      }

      if (itemsError) {
        this.logger.error('Error al obtener items de orden', itemsError, 'OrdersRepository');
        return { aggregate: null, error: itemsError.message };
      }

      const snapshot = this.mapToSnapshot(order, items || []);
      const aggregate = OrderAggregate.create(snapshot);
      return { aggregate };
    } catch (err: any) {
      this.logger.error('Excepción al cargar orden', err, 'OrdersRepository');
      return { aggregate: null, error: err?.message || 'Error inesperado de repositorio' };
    }
  }

  /**
   * Persiste el ajuste de cantidad de un ítem con reintentos y actualización atómica del total.
   */
  async persistItemQuantityAdjustment(
    orderId: number,
    itemId: number,
    newQuantity: number,
    newLineTotal: number,
    newOrderTotal: number,
    reason: ItemAdjustmentReason,
    commandId: string
  ): Promise<RepositoryExecutionResult<{ newQuantity: number; newOrderTotal: number }>> {
    return this.executeWithRetry(async () => {
      // 1. Si la cantidad es 0, marcar cancelado con motivo
      if (newQuantity === 0) {
        const { error: cancelError } = await this.api.cancelOrderItem(itemId);
        if (cancelError) throw cancelError;
      } else {
        const { error: itemError } = await this.api.updateOrderItemQuantity(itemId, newQuantity, newLineTotal);
        if (itemError) throw itemError;
      }

      // 2. Actualizar el total de la orden
      const { error: orderError } = await this.api.updateOrderTotal(orderId, newOrderTotal);
      if (orderError) throw orderError;

      this.logger.info('Ajuste de ítem persistido con éxito', { orderId, itemId, newQuantity, reason, commandId }, 'OrdersRepository');
      return { newQuantity, newOrderTotal };
    }, commandId);
  }

  /**
   * Persiste la anulación de una línea completa de producto.
   */
  async persistItemCancellation(
    orderId: number,
    itemId: number,
    newOrderTotal: number,
    reason: ItemAdjustmentReason,
    commandId: string
  ): Promise<RepositoryExecutionResult<{ cancelledItemId: number; newOrderTotal: number }>> {
    return this.executeWithRetry(async () => {
      const { error: cancelError } = await this.api.cancelOrderItem(itemId);
      if (cancelError) throw cancelError;

      const { error: orderError } = await this.api.updateOrderTotal(orderId, newOrderTotal);
      if (orderError) throw orderError;

      this.logger.info('Línea de orden cancelada con éxito', { orderId, itemId, reason, commandId }, 'OrdersRepository');
      return { cancelledItemId: itemId, newOrderTotal };
    }, commandId);
  }

  /**
   * Persiste el cambio de tipo de servicio (Mesa / Llevar / Domicilio).
   */
  async persistServiceTypeChange(
    orderId: number,
    serviceTypeId: number,
    serviceCode: ServiceTypeCode,
    numeroMesa: string | null,
    direccionEntrega: string | null,
    commandId: string
  ): Promise<RepositoryExecutionResult<{ serviceCode: ServiceTypeCode }>> {
    return this.executeWithRetry(async () => {
      const updatePayload: any = {
        tipo_servicio_id: serviceTypeId,
        numero_mesa: serviceCode === 'comedor' ? numeroMesa : null,
      };

      if (serviceCode === 'domicilio' && direccionEntrega) {
        // En esquemas donde la dirección o nota incluye el destino
        updatePayload.direccion_entrega = direccionEntrega;
      }

      // Actualizar en BD usando Supabase directamente
      const { error } = await this.supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (error) throw error;

      this.logger.info('Tipo de servicio actualizado en Supabase', { orderId, serviceCode, numeroMesa, commandId }, 'OrdersRepository');
      return { serviceCode };
    }, commandId);
  }

  /**
   * Persiste la anulación de la comanda completa con motivo tipado.
   */
  async persistOrderCancellation(
    orderId: number,
    reason: string,
    commandId: string
  ): Promise<RepositoryExecutionResult<{ orderId: number }>> {
    return this.executeWithRetry(async () => {
      const { order } = await this.api.getOrderById(orderId);
      const currentNote = order?.nota_general || '';

      const { error } = await this.api.cancelOrder(orderId, currentNote, reason);
      if (error) throw error;

      this.logger.info('Comanda cancelada en Supabase', { orderId, reason, commandId }, 'OrdersRepository');
      return { orderId };
    }, commandId);
  }

  /**
   * Persiste el registro de cobro/pago de la comanda.
   */
  async persistPaymentRegistration(
    orderId: number,
    paymentMethodId: number,
    propina: number,
    total: number,
    commandId: string
  ): Promise<RepositoryExecutionResult<{ orderId: number; total: number }>> {
    return this.executeWithRetry(async () => {
      const { error: payError } = await this.api.updatePaymentStatus(orderId, 'pagado');
      if (payError) throw payError;

      const { error: orderError } = await this.supabase
        .from('orders')
        .update({ metodo_pago_id: paymentMethodId, propina, total })
        .eq('id', orderId);

      if (orderError) throw orderError;

      this.logger.info('Pago de comanda registrado con éxito', { orderId, paymentMethodId, propina, total, commandId }, 'OrdersRepository');
      return { orderId, total };
    }, commandId);
  }

  // ------------------------------------------------------------------------
  // Mecanismo de Reintentos con Retroceso Exponencial (Exponential Backoff)
  // ------------------------------------------------------------------------

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    commandId: string,
    maxRetries = 3
  ): Promise<RepositoryExecutionResult<T>> {
    let attempt = 0;
    const delays = [1000, 2000, 4000]; // 1s, 2s, 4s

    while (attempt <= maxRetries) {
      try {
        const data = await operation();
        return {
          success: true,
          data,
          syncStatus: 'SYNCED',
        };
      } catch (err: any) {
        attempt++;
        const isConflict = err?.code === '409' || err?.status === 409;
        if (isConflict) {
          this.logger.warn(`Conflicto de concurrencia detectado para command ${commandId}`, err, 'OrdersRepository');
          return {
            success: false,
            error: 'Conflicto de concurrencia. La orden fue modificada por otro usuario.',
            syncStatus: 'CONFLICT',
          };
        }

        if (attempt > maxRetries) {
          this.logger.error(`Operación falló definitivamente tras ${maxRetries} intentos`, err, 'OrdersRepository');
          return {
            success: false,
            error: err?.message || 'Error de persistencia remota',
            syncStatus: 'FAILED',
          };
        }

        const delay = delays[attempt - 1] || 4000;
        this.logger.warn(`Intento ${attempt} fallido. Reintentando en ${delay}ms...`, err, 'OrdersRepository');
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: 'Reintentos agotados',
      syncStatus: 'FAILED',
    };
  }

  // ------------------------------------------------------------------------
  // Mapeador de Base de Datos a Snapshot de Dominio
  // ------------------------------------------------------------------------

  private mapToSnapshot(order: any, rawItems: any[]): OrderSnapshot {
    const rawCode = (order.tipos_servicio?.nombre || '').toLowerCase();
    let serviceCode: ServiceTypeCode = 'comedor';
    if (rawCode.includes('llevar') || rawCode.includes('take')) {
      serviceCode = 'llevar';
    } else if (rawCode.includes('domicilio') || rawCode.includes('delivery')) {
      serviceCode = 'domicilio';
    }

    const items: OrderItemSnapshot[] = rawItems.map((item: any) => ({
      id: Number(item.id),
      producto_id: Number(item.producto_id || 0),
      nombre_producto: item.nombre_producto || 'Producto',
      cantidad: Number(item.cantidad || 0),
      precio_unitario: Number(item.precio_unitario || 0),
      total: Number(item.total || item.cantidad * item.precio_unitario || 0),
      nota: item.nota || null,
      estado: item.estado === 'cancelado' ? 'cancelado' : 'activo',
      motivo_ajuste: item.motivo_cancelacion || item.motivo_ajuste || null,
      modificadores: (item.modificadores || []).map((m: any) => ({
        id: Number(m.id),
        nombre_modificador: m.nombre_modificador || m.nombre || '',
        cantidad: Number(m.cantidad || 1),
        precio_unitario: Number(m.precio_unitario || 0),
      })),
      syncStatus: 'SYNCED',
    }));

    return {
      id: Number(order.id),
      numero_orden: order.numero_orden ? Number(order.numero_orden) : undefined,
      version: 1,
      cliente_id: order.cliente_id ? Number(order.cliente_id) : null,
      cliente_nombre: order.clientes?.nombre || 'Consumidor Final',
      cliente_telefono: order.clientes?.telefono || undefined,
      metodo_pago_id: Number(order.metodo_pago_id || 1),
      metodo_pago_nombre: order.metodos_pago?.nombre || undefined,
      tipo_servicio_id: Number(order.tipo_servicio_id || 1),
      tipo_servicio_codigo: serviceCode,
      tipo_servicio_nombre: order.tipos_servicio?.nombre || undefined,
      numero_mesa: order.numero_mesa ? String(order.numero_mesa) : null,
      direccion_entrega: order.direccion_entrega ? String(order.direccion_entrega) : null,
      turno_id: order.turno_id ? Number(order.turno_id) : null,
      estado_pedido: order.estado_pedido || 'pendiente',
      estado_pago: order.estado_pago || 'pendiente',
      items,
      subtotal: Number(order.total || 0) - Number(order.propina || 0),
      propina: Number(order.propina || 0),
      total: Number(order.total || 0),
      nota_general: order.nota_general || null,
      motivo_cancelacion: order.motivo_cancelacion || null,
      fecha_creacion: order.fecha_creacion || new Date().toISOString(),
      fecha_cierre: order.fecha_cierre || null,
    };
  }
}
