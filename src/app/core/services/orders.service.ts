import { Injectable, inject, signal, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

import { LoggerService } from '@core/services/logger.service';
import { OrderDatabase } from '@core/services/order-db.service';
import { OrderCreateDto, OrderCreateResponse, OrderCreateItem, OrderListItem, PaymentMethod, ServiceType, Client } from '@core/models/order.model';

import { OrdersApi } from '@core/api/orders.api';
import { CartState } from '@core/state/cart.state';
import { OrdersRepository } from '@core/repositories/orders.repository';
import { OrderAggregate } from '@core/domain/order/order.aggregate';
import {
  AdjustItemQuantityCommand,
  CancelItemCommand,
  ChangeOrderStatusCommand,
  ChangeServiceTypeCommand,
  CommandResult,
  ItemAdjustmentReason,
  RegisterPaymentCommand,
  ServiceTypeCode,
  SyncStatus,
} from '@core/domain/order/order.types';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(OrdersApi);
  private readonly repository = inject(OrdersRepository);
  private readonly cartState = inject(CartState);
  private readonly db = inject(OrderDatabase);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  creating = signal(false);
  syncing = signal(false);
  error = signal<string | null>(null);
  lastOrder = signal<{ order_id: number; total: number } | null>(null);
  editingOrderId = signal<number | string | null>(null);

  // --- SEÑALES DE DOMINIO Y OPTIMISTIC UI ---
  currentOrderAggregate = signal<OrderAggregate | null>(null);
  orderSyncStatus = signal<Record<number, SyncStatus>>({});
  orderLevelSyncStatus = signal<SyncStatus>('SYNCED');

  orders = signal<OrderListItem[]>([]);
  loadingOrders = signal(false);

  // --- FACHADA HACIA CART STATE (CERO REGRESIONES) ---
  get cart() { return this.cartState.cart; }
  get cartCount() { return this.cartState.cartCount; }

  isOnline = signal(true);
  private channel: any = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.isOnline.set(navigator.onLine);

      fromEvent(window, 'online').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.isOnline.set(true);
        this.syncQueue();
      });

      fromEvent(window, 'offline').pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        this.isOnline.set(false);
      });

      setTimeout(() => this.syncQueue(), 3000);
    }
  }

  // ==========================================
  // QUERY METHODS
  // ==========================================
  async loadOrders(dateFilter?: { start: string; end: string }): Promise<void> {
    try {
      this.loadingOrders.set(true);
      const query = this.api.getOrdersQuery(dateFilter);
      const { data, error } = await query;
      if (error) throw error;
      
      const mappedOrders: OrderListItem[] = (data || []).map((o: any) => this.mapOrderListItem(o));
      this.orders.set(mappedOrders);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Error cargando órdenes';
      this.logger.error('Error cargando órdenes', e, 'OrdersService');
      this.error.set(errorMsg);
    } finally {
      this.loadingOrders.set(false);
    }
  }

  private mapOrderListItem(o: any): OrderListItem {
    return {
      id: o.id,
      numero_orden: o.numero_orden,
      nota_general: o.nota_general,
      fecha_creacion: o.fecha_creacion,
      fecha_cierre: o.fecha_cierre,
      total: o.total,
      estado_pedido: o.estado_pedido,
      estado_pago: o.estado_pago,
      metodo_pago_id: o.metodo_pago_id,
      tipo_servicio_id: o.tipo_servicio_id,
      turno_id: o.turno_id,
      cliente_nombre: o.clientes?.nombre || 'Consumidor Final',
      tipo_servicio_nombre: o.tipos_servicio?.nombre || 'N/A',
      order_items: (o.order_items || []).map((item: any) => ({
        id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        nombre_producto: item.nombre_producto || 'Producto',
        nota: item.nota,
        producto_id: item.producto_id,
        modificadores: (item.order_item_modificadores || []).map((m: any) => ({
          id: m.id,
          nombre: m.nombre_modificador,
          cantidad: m.cantidad,
          precio_unitario: m.precio_unitario
        }))
      }))
    };
  }

  // ==========================================
  // MUTATION METHODS
  // ==========================================
  async createOrder(dto: OrderCreateDto): Promise<OrderCreateResponse> { 
    this.creating.set(true); 
    this.error.set(null); 
  
    try {
      await this.db.save({ id: dto.client_request_id, status: 'pending', payload: dto, createdAt: Date.now() }); 
    
      if (this.isOnline()) { 
        try { 
          const res = await this.sendToServer(dto); 
          if (res?.status === 'success' || res?.status === 'conflict') { 
            await this.db.markSynced(dto.client_request_id); 
            this.lastOrder.set({ order_id: res.order_id, total: res.total }); 
            
            try {
              await this.api.insertTicket({
                order_id: res.order_id,
                tipo: dto.tipo_servicio_id === 1 ? 'ticket_llevar' : 'ticket_cocina',
                impreso: false
              });
            } catch (te: any) {
              this.logger.error('Error creating ticket', te, 'OrdersService');
            }
            
            return res; 
          } 
          return res; 
        } catch (e: unknown) { 
          this.error.set('Se guardó offline. Se sincronizará automáticamente.'); 
        } 
      } 
      return { status: 'success', order_id: 0, total: 0 } as OrderCreateResponse;
    } finally {
      this.creating.set(false);
    }
  }

  async addItemsToOrder(orderId: number, items: any[], nota_general: string | null, propina: number) {
    let addedTotal = 0;
    
    const itemInsertPromises = items.map(async (item) => {
      addedTotal += item.total;
      const { data: newItem, error: itemError } = await this.api.insertOrderItem({
        order_id: orderId, producto_id: item.producto_id, nombre_producto: item.nombre_producto,
        cantidad: item.cantidad, nota: item.nota, precio_unitario: item.precio_unitario, total: item.total
      });
      if (itemError) throw itemError;
      return { dbId: newItem.id, modificadores: item.modificadores || [] };
    });

    const insertedItems = await Promise.all(itemInsertPromises);

    const modsToInsert: any[] = [];
    for (const { dbId, modificadores } of insertedItems) {
      if (modificadores.length > 0) {
        modificadores.forEach((m: any) => {
          modsToInsert.push({
            order_item_id: dbId, nombre_modificador: m.nombre_modificador,
            cantidad: m.cantidad, precio_unitario: m.precio_unitario || 0
          });
        });
      }
    }

    if (modsToInsert.length > 0) {
      await this.api.insertOrderItemModifiers(modsToInsert);
    }

    const { data: orderData, error: fetchError } = await this.api.getOrderTotal(orderId);
    if (fetchError) throw fetchError;

    const newTotal = Number(orderData.total || 0) + addedTotal;
    await this.api.updateOrderTotalAndNote(orderId, newTotal, nota_general, propina);
  }

  async syncQueue() {
    if (!this.isOnline() || this.syncing()) return; 
    this.syncing.set(true); 
    try {
      const pending = await this.db.getPending(); 
      for (const order of pending) { 
        try { 
          const res = await this.sendToServer(order.payload); 
          if (res?.status === 'success' || res?.status === 'conflict') { 
            await this.db.markSynced(order.id); 
          } 
        } catch (e: any) { 
          await this.db.markFailed(order.id, e.message); 
        } 
      } 
    } finally {
      this.syncing.set(false);
    }
  }

  async cancelItemFromOrder(orderId: number, itemId: number, propina: number) {
    const { error: cancelError } = await this.api.cancelOrderItem(itemId);
    if (cancelError) throw cancelError;

    const { data: activeItems, error: fetchError } = await this.api.getActiveOrderItems(orderId);
    if (fetchError) throw fetchError;

    const newItemsTotal = (activeItems || []).reduce((sum: number, item: any) => sum + Number(item.total || 0), 0);
    const newTotal = newItemsTotal + propina;

    const { error: updateTotalError } = await this.api.updateOrderTotal(orderId, newTotal);
    if (updateTotalError) throw updateTotalError;
  }

  private async sendToServer(dto: OrderCreateDto) {
    const { data, error } = await this.api.rpcCreateOrderV1({ 
      p_client_request_id: dto.client_request_id, p_cliente_id: dto.cliente_id ?? null, p_items: dto.items, 
      p_metodo_pago_id: dto.metodo_pago_id, p_propina: dto.propina ?? 0, p_tipo_servicio_id: dto.tipo_servicio_id, 
      p_turno_id: dto.turno_id ?? null 
    }); 
    if (error) throw error;
    if (data?.status === 'success' && dto.nota_general) {
      await this.api.updateOrderNote(data.order_id, dto.nota_general);
    }
    return data; 
  }

  // ==========================================
  // REALTIME
  // ==========================================
  subscribeRealtime() {
    if (this.channel) return;
    this.channel = this.api.getRealtimeChannel()
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            try {
              const { data, error } = await this.api.getOrderListItem(newOrder.id);
              if (!error && data) {
                const mapped = this.mapOrderListItem(data);
                this.orders.update(current => {
                  const index = current.findIndex(o => o.id === mapped.id);
                  if (index >= 0) {
                    const copy = [...current];
                    copy[index] = mapped;
                    return copy;
                  }
                  return [mapped, ...current];
                });
                return;
              }
              if (error) {
                this.logger.error('Error fetching realtime order detail', error, 'OrdersService');
              }
            } catch (err) {
              this.logger.error('Unexpected error fetching realtime order detail', err, 'OrdersService');
            }

            // Fallback de contingencia: sólo si la red falla se preservan los campos reales recibidos sin duplicar
            this.orders.update(current => {
              const index = current.findIndex(o => o.id === newOrder.id);
              if (index >= 0) return current;
              return [{
                id: newOrder.id, numero_orden: newOrder.numero_orden, nota_general: newOrder.nota_general,
                fecha_creacion: newOrder.fecha_creacion, fecha_cierre: newOrder.fecha_cierre, total: newOrder.total,
                estado_pedido: newOrder.estado_pedido, estado_pago: newOrder.estado_pago,
                metodo_pago_id: newOrder.metodo_pago_id, tipo_servicio_id: newOrder.tipo_servicio_id, turno_id: newOrder.turno_id,
                cliente_nombre: 'Consumidor Final', tipo_servicio_nombre: 'N/A', order_items: []
              }, ...current];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            this.orders.update(orders => orders.map(o => o.id === updatedOrder.id ? {
                ...o,
                estado_pedido: updatedOrder.estado_pedido ?? o.estado_pedido,
                estado_pago: updatedOrder.estado_pago ?? o.estado_pago,
                total: updatedOrder.total !== undefined ? updatedOrder.total : o.total,
                fecha_cierre: updatedOrder.fecha_cierre !== undefined ? updatedOrder.fecha_cierre : o.fecha_cierre,
                nota_general: updatedOrder.nota_general !== undefined ? updatedOrder.nota_general : o.nota_general,
                metodo_pago_id: updatedOrder.metodo_pago_id ?? o.metodo_pago_id,
                tipo_servicio_id: updatedOrder.tipo_servicio_id ?? o.tipo_servicio_id,
                turno_id: updatedOrder.turno_id ?? o.turno_id
              } : o));
          } else if (payload.eventType === 'DELETE') {
            this.orders.update(orders => orders.filter(o => o.id !== payload.old?.id));
          }
      }).subscribe();
  }

  unsubscribeRealtime() {
    if (this.channel) {
      this.api.removeRealtimeChannel(this.channel);
      this.channel = null;
    }
  }

  // ==========================================
  // DOMAIN & OPTIMISTIC ORCHESTRATION
  // ==========================================
  async loadOrderAggregate(orderId: number | string): Promise<OrderAggregate | null> {
    const { aggregate, error } = await this.repository.getOrderAggregate(orderId);
    if (error || !aggregate) {
      this.logger.error('Error al cargar aggregate de orden', error, 'OrdersService');
      return null;
    }
    this.currentOrderAggregate.set(aggregate);
    this.orderSyncStatus.set({});
    this.orderLevelSyncStatus.set('SYNCED');
    return aggregate;
  }

  async adjustItemQuantity(
    orderId: number,
    itemId: number,
    options: {
      delta?: number;
      targetQuantity?: number;
      reason: ItemAdjustmentReason;
      reasonNotes?: string;
    }
  ): Promise<CommandResult<{ newQuantity: number; newTotal: number }>> {
    let aggregate = this.currentOrderAggregate();
    if (!aggregate || aggregate.id !== orderId) {
      aggregate = await this.loadOrderAggregate(orderId);
      if (!aggregate) {
        return { success: false, commandId: '', version: 0, error: 'Orden no disponible' };
      }
    }

    const previousAggregate = aggregate;
    const commandId = crypto.randomUUID();
    const cmd: AdjustItemQuantityCommand = {
      type: 'ADJUST_ITEM_QUANTITY',
      commandId,
      orderId,
      itemId,
      delta: options.delta,
      targetQuantity: options.targetQuantity,
      reason: options.reason,
      reasonNotes: options.reasonNotes,
    };

    // 1. Ejecución PURA en Aggregate (Validación de invariantes)
    const { aggregate: nextAggregate, result } = aggregate.execute<{ newQuantity: number; newTotal: number }>(cmd);
    if (!result.success) {
      return result;
    }

    // 2. OPTIMISTIC UI: Mutación inmediata en memoria local (0ms de latencia visual)
    this.currentOrderAggregate.set(nextAggregate);
    this.orderSyncStatus.update((s) => ({ ...s, [itemId]: 'SYNCING' }));

    // 3. Persistencia asíncrona en Supabase mediante OrdersRepository
    const targetItem = nextAggregate.items.find((i) => i.id === itemId);
    const newQty = targetItem?.cantidad ?? 0;
    const newLineTotal = targetItem?.total ?? 0;

    const repoResult = await this.repository.persistItemQuantityAdjustment(
      orderId,
      itemId,
      newQty,
      newLineTotal,
      nextAggregate.total,
      options.reason,
      commandId
    );

    if (repoResult.success) {
      this.orderSyncStatus.update((s) => ({ ...s, [itemId]: 'SYNCED' }));
      return result;
    } else {
      // 4. ROLLBACK garantizado en caso de fallo remoto o conflicto 409
      this.logger.warn('Rollback ejecutado por fallo en persistencia de ajuste', repoResult.error, 'OrdersService');
      this.currentOrderAggregate.set(previousAggregate);
      this.orderSyncStatus.update((s) => ({ ...s, [itemId]: repoResult.syncStatus }));
      return {
        success: false,
        commandId,
        version: previousAggregate.version,
        error: repoResult.error,
      };
    }
  }

  async cancelOrderItem(
    orderId: number,
    itemId: number,
    reason: ItemAdjustmentReason,
    reasonNotes?: string
  ): Promise<CommandResult<{ cancelledItemId: number; newTotal: number }>> {
    let aggregate = this.currentOrderAggregate();
    if (!aggregate || aggregate.id !== orderId) {
      aggregate = await this.loadOrderAggregate(orderId);
      if (!aggregate) {
        return { success: false, commandId: '', version: 0, error: 'Orden no disponible' };
      }
    }

    const previousAggregate = aggregate;
    const commandId = crypto.randomUUID();
    const cmd: CancelItemCommand = {
      type: 'CANCEL_ITEM',
      commandId,
      orderId,
      itemId,
      reason,
      reasonNotes,
    };

    const { aggregate: nextAggregate, result } = aggregate.execute<{ cancelledItemId: number; newTotal: number }>(cmd);
    if (!result.success) {
      return result;
    }

    this.currentOrderAggregate.set(nextAggregate);
    this.orderSyncStatus.update((s) => ({ ...s, [itemId]: 'SYNCING' }));

    const repoResult = await this.repository.persistItemCancellation(
      orderId,
      itemId,
      nextAggregate.total,
      reason,
      commandId
    );

    if (repoResult.success) {
      this.orderSyncStatus.update((s) => ({ ...s, [itemId]: 'SYNCED' }));
      return result;
    } else {
      this.currentOrderAggregate.set(previousAggregate);
      this.orderSyncStatus.update((s) => ({ ...s, [itemId]: repoResult.syncStatus }));
      return {
        success: false,
        commandId,
        version: previousAggregate.version,
        error: repoResult.error,
      };
    }
  }

  async changeOrderServiceType(
    orderId: number,
    newServiceTypeId: number,
    newServiceCode: ServiceTypeCode,
    options?: {
      numero_mesa?: string | null;
      direccion_entrega?: string | null;
      newServiceName?: string;
    }
  ): Promise<CommandResult<{ newServiceType: string }>> {
    let aggregate = this.currentOrderAggregate();
    if (!aggregate || aggregate.id !== orderId) {
      aggregate = await this.loadOrderAggregate(orderId);
      if (!aggregate) {
        return { success: false, commandId: '', version: 0, error: 'Orden no disponible' };
      }
    }

    const previousAggregate = aggregate;
    const commandId = crypto.randomUUID();
    const cmd: ChangeServiceTypeCommand = {
      type: 'CHANGE_SERVICE_TYPE',
      commandId,
      orderId,
      newServiceTypeId,
      newServiceCode,
      newServiceName: options?.newServiceName,
      numero_mesa: options?.numero_mesa,
      direccion_entrega: options?.direccion_entrega,
    };

    const { aggregate: nextAggregate, result } = aggregate.execute<{ newServiceType: string }>(cmd);
    if (!result.success) {
      return result;
    }

    this.currentOrderAggregate.set(nextAggregate);
    this.orderLevelSyncStatus.set('SYNCING');

    const repoResult = await this.repository.persistServiceTypeChange(
      orderId,
      newServiceTypeId,
      newServiceCode,
      nextAggregate.numero_mesa ?? null,
      nextAggregate.direccion_entrega ?? null,
      commandId
    );

    if (repoResult.success) {
      this.orderLevelSyncStatus.set('SYNCED');
      return result;
    } else {
      this.currentOrderAggregate.set(previousAggregate);
      this.orderLevelSyncStatus.set(repoResult.syncStatus);
      return {
        success: false,
        commandId,
        version: previousAggregate.version,
        error: repoResult.error,
      };
    }
  }

  // ==========================================
  // UTILS & API METHODS (Retrocompatible)
  // ==========================================
  async updateOrderStatus(orderId: number, status: string, closeDate: string | null) { return this.api.updateOrderStatus(orderId, status, closeDate); }
  async updatePaymentStatus(orderId: number, status: string) { return this.api.updatePaymentStatus(orderId, status); }
  async bulkUpdateOrderStatus(ids: number[], status: string, closeDate: string | null) { return this.api.bulkUpdateOrderStatus(ids, status, closeDate); }
  async bulkUpdatePaymentStatus(ids: number[], status: string) { return this.api.bulkUpdatePaymentStatus(ids, status); }
  async getPaymentMethods() { return this.api.getPaymentMethods(); }
  async getServiceTypes() { return this.api.getServiceTypes(); }
  async getClients(limit: number = 100) { return this.api.getClients(limit); }
  async getOrderById(id: string | number) { return this.api.getOrderById(id); }

  async cancelOrder(orderId: number, reason: string) {
    try {
      this.creating.set(true);
      const commandId = crypto.randomUUID();
      const repoResult = await this.repository.persistOrderCancellation(orderId, reason || 'Sin motivo especificado', commandId);
      if (!repoResult.success) throw new Error(repoResult.error);
      
      const aggregate = this.currentOrderAggregate();
      if (aggregate && aggregate.id === orderId) {
        const cmd: ChangeOrderStatusCommand = {
          type: 'CHANGE_ORDER_STATUS',
          commandId,
          orderId,
          newStatus: 'cancelado',
          reason,
        };
        const { aggregate: nextAggregate } = aggregate.execute(cmd);
        this.currentOrderAggregate.set(nextAggregate);
      }

      this.logger.info('Orden cancelada con éxito', { orderId, reason }, 'OrdersService');
      return { success: true };
    } catch (e: any) {
      this.logger.error('Error al cancelar orden', e, 'OrdersService');
      return { success: false, error: e.message };
    } finally {
      this.creating.set(false);
    }
  }

  async incrementOrderItem(orderId: number, itemId: number, currentQty: number, unitPrice: number, propina: number) {
    const result = await this.adjustItemQuantity(orderId, itemId, { delta: 1, reason: 'courtesy_modification' });
    if (!result.success) throw new Error(result.error || 'Error al incrementar producto');
  }

  // ==========================================
  // CART FACHADA (Proxy)
  // ==========================================
  addProduct(p: any) { this.cartState.addProduct(p); }
  addVariant(v: any, p: any) { this.cartState.addVariant(v, p); }
  increment(i: any) { this.cartState.increment(i); }
  decrement(i: any) { this.cartState.decrement(i); }
  remove(i: any) { this.cartState.remove(i); }
  clearCart() { this.cartState.clearCart(); }
}
