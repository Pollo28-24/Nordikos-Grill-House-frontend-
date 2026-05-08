import { Injectable, inject, signal, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent } from 'rxjs';

import { LoggerService } from '@core/services/logger.service';
import { OrderDatabase } from '@core/services/order-db.service';
import { OrderCreateDto, OrderCreateResponse, OrderCreateItem, OrderListItem } from '@core/models/order.model';

import { OrdersApi } from '@core/api/orders.api';
import { CartState } from '@core/state/cart.state';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly api = inject(OrdersApi);
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
      
      const mappedOrders: OrderListItem[] = (data || []).map((o: any) => ({
        id: o.id, numero_orden: o.numero_orden, nota_general: o.nota_general,
        fecha_creacion: o.fecha_creacion, fecha_cierre: o.fecha_cierre, total: o.total,
        estado_pedido: o.estado_pedido, estado_pago: o.estado_pago,
        metodo_pago_id: o.metodo_pago_id, tipo_servicio_id: o.tipo_servicio_id, turno_id: o.turno_id,
        cliente_nombre: o.clientes?.nombre || 'Consumidor Final',
        tipo_servicio_nombre: o.tipos_servicio?.nombre || 'N/A',
        order_items: (o.order_items || []).map((item: any) => ({
          id: item.id, cantidad: item.cantidad, precio_unitario: item.precio_unitario,
          nombre_producto: item.nombre_producto || 'Producto', nota: item.nota, producto_id: item.producto_id,
          modificadores: (item.order_item_modificadores || []).map((m: any) => ({
            id: m.id, nombre: m.nombre_modificador, cantidad: m.cantidad, precio_unitario: m.precio_unitario
          }))
        }))
      }));
      this.orders.set(mappedOrders);
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Error cargando órdenes';
      this.logger.error('Error cargando órdenes', e, 'OrdersService');
      this.error.set(errorMsg);
    } finally {
      this.loadingOrders.set(false);
    }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload: any) => {
          const current = this.orders();
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            this.orders.set([{
              id: newOrder.id, numero_orden: newOrder.numero_orden, nota_general: newOrder.nota_general,
              fecha_creacion: newOrder.fecha_creacion, fecha_cierre: newOrder.fecha_cierre, total: newOrder.total,
              estado_pedido: newOrder.estado_pedido, estado_pago: newOrder.estado_pago,
              metodo_pago_id: newOrder.metodo_pago_id, tipo_servicio_id: newOrder.tipo_servicio_id, turno_id: newOrder.turno_id,
              cliente_nombre: 'Consumidor Final', tipo_servicio_nombre: 'N/A', order_items: []
            }, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new;
            this.orders.update(orders => orders.map(o => o.id === updatedOrder.id ? {
                ...o, estado_pedido: updatedOrder.estado_pedido, estado_pago: updatedOrder.estado_pago,
                total: updatedOrder.total, fecha_cierre: updatedOrder.fecha_cierre
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
  // UTILS & SIMPLE API CALLS
  // ==========================================
  async updateOrderStatus(orderId: number, status: string, closeDate: string | null) { return this.api.updateOrderStatus(orderId, status, closeDate); }
  async updatePaymentStatus(orderId: number, status: string) { return this.api.updatePaymentStatus(orderId, status); }
  async bulkUpdateOrderStatus(ids: number[], status: string, closeDate: string | null) { return this.api.bulkUpdateOrderStatus(ids, status, closeDate); }
  async bulkUpdatePaymentStatus(ids: number[], status: string) { return this.api.bulkUpdatePaymentStatus(ids, status); }
  async getServiceTypes() { return this.api.getServiceTypes(); }
  async getOrderById(id: string | number) { return this.api.getOrderById(id); }

  async cancelOrder(orderId: number, reason: string) {
    try {
      this.creating.set(true);
      
      // Ya no modificamos la nota_general, solo obtenemos la actual para la API si fuera necesario
      const { order: currentOrder } = await this.api.getOrderById(orderId);
      const currentNote = currentOrder?.nota_general || '';
      
      // Enviamos el motivo únicamente a la nueva columna motivo_cancelacion
      // Mantenemos la nota_general tal cual estaba sin añadir marcas de cancelación
      const { error } = await this.api.cancelOrder(orderId, currentNote, reason || 'Sin motivo especificado');
      if (error) throw error;
      
      this.logger.info('Orden cancelada con éxito', { orderId, reason }, 'OrdersService');
      return { success: true };
    } catch (e: any) {
      this.logger.error('Error al cancelar orden', e, 'OrdersService');
      return { success: false, error: e.message };
    } finally {
      this.creating.set(false);
    }
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
