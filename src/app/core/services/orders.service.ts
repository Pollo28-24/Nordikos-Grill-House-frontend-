import { Injectable, inject, signal, computed, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { fromEvent, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { LoggerService } from './logger.service';
import { OrderDatabase } from './order-db.service';
import { OrderCreateDto, OrderCreateResponse, OrderCreateItem } from '../../core/models/order.model';

export interface OrderItemModifier {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface OrderItemSimple {
  id: number;
  cantidad: number;
  precio_unitario: number;
  nombre_producto: string;
  nota?: string;
  producto_id: number;
  variante_id?: number;
  modificadores: OrderItemModifier[];
}

export interface OrderListItem {
  id: number;
  numero_orden?: number;
  nota_general?: string;
  fecha_creacion: string;
  fecha_cierre?: string;
  total: number;
  estado_pedido: string;
  estado_pago: string;
  metodo_pago_id: number;
  tipo_servicio_id: number;
  turno_id: number | null;
  cliente_nombre: string;
  tipo_servicio_nombre: string;
  order_items: OrderItemSimple[];
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private supabase = inject(SupabaseService).client;
  private db = inject(OrderDatabase);
  private platformId = inject(PLATFORM_ID);
  private logger = inject(LoggerService);
  private destroyRef = inject(DestroyRef);
  private destroy$ = new Subject<void>();

  creating = signal(false); 
  syncing = signal(false); 
  error = signal<string | null>(null); 
  lastOrder = signal<{ order_id: number; total: number } | null>(null); 
  editingOrderId = signal<number | string | null>(null); 

  orders = signal<OrderListItem[]>([]); 
  loadingOrders = signal(false); 

  cart = signal<OrderCreateItem[]>([]); 
  cartCount = computed(() => 
    this.cart().reduce((acc, i) => acc + i.cantidad, 0) 
  ); 

  isOnline = signal(true); 
  private channel: ReturnType<typeof this.supabase.channel> | null = null;

  constructor() { 
    if (isPlatformBrowser(this.platformId)) { 
      this.isOnline.set(navigator.onLine);

      fromEvent(window, 'online')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => { 
          this.isOnline.set(true); 
          this.syncQueue(); 
        });

      fromEvent(window, 'offline')
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => { 
          this.isOnline.set(false); 
        });

      this.destroyRef.onDestroy(() => {
        this.destroy$.next();
        this.destroy$.complete();
      });

      setTimeout(() => this.syncQueue(), 3000); 
    } 
  }

  async loadOrders(dateFilter?: { start: string; end: string }): Promise<void> {
    try {
      this.loadingOrders.set(true);
      let query = this.supabase
        .from('orders')
        .select(`
          id, 
          numero_orden, 
          nota_general, 
          fecha_creacion, 
          fecha_cierre, 
          total, 
          estado_pedido, 
          estado_pago, 
          metodo_pago_id, 
          tipo_servicio_id, 
          turno_id,
          clientes (nombre),
          tipos_servicio (nombre),
          order_items (
            id,
            cantidad,
            precio_unitario,
            nombre_producto,
            nota,
            producto_id,
            order_item_modificadores (
              id,
              nombre_modificador,
              cantidad,
              precio_unitario
            )
          )
        `)
        .order('fecha_creacion', { ascending: false });

      if (dateFilter) {
        query = query.gte('fecha_creacion', dateFilter.start).lte('fecha_creacion', dateFilter.end);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      this.orders.set((data || []).map((o: any) => ({
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
      })));
    } catch (e: any) {
      this.logger.error('Error cargando órdenes', e, 'OrdersService');
      this.error.set(e?.message ?? 'Error cargando órdenes');
    } finally {
      this.loadingOrders.set(false);
    }
  }

  async createOrder(dto: OrderCreateDto): Promise<OrderCreateResponse> { 
    this.creating.set(true); 
    this.error.set(null); 
  
    await this.db.save({ 
      id: dto.client_request_id, 
      status: 'pending', 
      payload: dto, 
      createdAt: Date.now() 
    }); 
  
    if (this.isOnline()) { 
      try { 
        const res = await this.sendToServer(dto); 
  
        if (res?.status === 'success' || res?.status === 'conflict') { 
          await this.db.markSynced(dto.client_request_id); 
          this.lastOrder.set({ order_id: res.order_id, total: res.total }); 
          
          this.supabase.from('tickets').insert({
            order_id: res.order_id,
            tipo: dto.tipo_servicio_id === 1 ? 'ticket_llevar' : 'ticket_cocina',
            impreso: false
          }).then(({ error: te }) => { 
            if (te) this.logger.error('Error creating ticket', te, 'OrdersService'); 
          });

          return res; 
        } 
  
        return res; 
      } catch (e: any) { 
        this.error.set('Se guardó offline. Se sincronizará automáticamente.'); 
      } 
    } 
  
    return { status: 'success', order_id: 0, total: 0 } as OrderCreateResponse; 
  }
  
  async syncQueue() {
    if (!this.isOnline() || this.syncing()) return; 
  
    this.syncing.set(true); 
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
  
    this.syncing.set(false); 
  }

  private async sendToServer(dto: OrderCreateDto) {
    const { data, error } = await this.supabase.rpc('orders_create_v1', { 
      p_client_request_id: dto.client_request_id, 
      p_cliente_id: dto.cliente_id ?? null, 
      p_items: dto.items, 
      p_metodo_pago_id: dto.metodo_pago_id, 
      p_propina: dto.propina ?? 0, 
      p_tipo_servicio_id: dto.tipo_servicio_id, 
      p_turno_id: dto.turno_id ?? null 
    }); 
  
    if (error) throw error;

    if (data?.status === 'success' && dto.nota_general) {
      await this.supabase.from('orders').update({ nota_general: dto.nota_general }).eq('id', data.order_id);
    }

    return data; 
  }

  async updateOrderRpc(orderId: number | string, items: any[], notaGeneral?: string | null): Promise<any> {
    try {
      this.creating.set(true);
      const { data, error } = await this.supabase.rpc('orders_update_items_v1', {
        p_order_id: orderId,
        p_items: items,
        p_nota_general: notaGeneral ?? null
      });

      if (error) throw error;
      return data;
    } catch (e: any) {
      console.error('Error in updateOrderRpc:', e);
      throw e;
    } finally {
      this.creating.set(false);
    }
  }

  addProduct(product: { id: string | number; nombre: string }) { 
    this.cart.update(items => { 
      const i = items.findIndex(x => x.producto_id === product.id && !x.variante_id); 
  
      if (i !== -1) { 
        const updated = [...items];
        updated[i] = { ...updated[i], cantidad: updated[i].cantidad + 1 }; 
        return updated; 
      } 
  
      return [...items, { 
        producto_id: product.id, 
        nombre_producto: product.nombre, 
        cantidad: 1, 
        modificadores: [] 
      }]; 
    }); 
  }

  addVariant(variant: { id: string | number; nombre: string }, product: { id: string | number; nombre: string }) {
    this.cart.update(items => {
      const i = items.findIndex(x => x.variante_id === variant.id);
      if (i !== -1) {
        const updated = [...items];
        updated[i] = { ...updated[i], cantidad: updated[i].cantidad + 1 };
        return updated;
      }
      return [...items, {
        variante_id: variant.id,
        producto_id: product.id,
        nombre_producto: `${product.nombre} - ${variant.nombre}`,
        cantidad: 1,
        modificadores: []
      }];
    });
  }
  
  increment(item: OrderCreateItem) { 
    this.cart.update(items => 
      items.map(i => 
        i === item ? { ...i, cantidad: i.cantidad + 1 } : i 
      ) 
    ); 
  }
  
  decrement(item: OrderCreateItem) { 
    this.cart.update(items => 
      item.cantidad > 1 
        ? items.map(i => 
            i === item ? { ...i, cantidad: i.cantidad - 1 } : i 
          ) 
        : items.filter(i => i !== item) 
    ); 
  }

  remove(item: OrderCreateItem) {
    this.cart.update(items => items.filter(i => i !== item));
  }
  
  clearCart() { 
    this.cart.set([]); 
  }

  subscribeRealtime() {
    if (this.channel) return;
    this.channel = this.supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload: any) => {
          const current = this.orders();
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as any;
            this.orders.set([{
              id: newOrder.id,
              numero_orden: newOrder.numero_orden,
              nota_general: newOrder.nota_general,
              fecha_creacion: newOrder.fecha_creacion,
              fecha_cierre: newOrder.fecha_cierre,
              total: newOrder.total,
              estado_pedido: newOrder.estado_pedido,
              estado_pago: newOrder.estado_pago,
              metodo_pago_id: newOrder.metodo_pago_id,
              tipo_servicio_id: newOrder.tipo_servicio_id,
              turno_id: newOrder.turno_id,
              cliente_nombre: newOrder.clientes?.nombre || 'Consumidor Final',
              tipo_servicio_nombre: newOrder.tipos_servicio?.nombre || 'N/A',
              order_items: []
            }, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as any;
            this.orders.set(
              current.map((o) => (o.id === updatedOrder.id ? {
                ...o,
                estado_pedido: updatedOrder.estado_pedido,
                estado_pago: updatedOrder.estado_pago,
                total: updatedOrder.total,
                fecha_cierre: updatedOrder.fecha_cierre
              } : o)),
            );
          } else if (payload.eventType === 'DELETE') {
            this.orders.set(current.filter((o) => o.id !== payload.old?.id));
          }
        },
      )
      .subscribe();
  }

  unsubscribeRealtime() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
