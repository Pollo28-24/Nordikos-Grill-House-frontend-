import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { OrderDatabase } from './order-db.service';
import { OrderCreateDto, OrderCreateResponse, OrderCreateItem } from '../../core/models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private supabase = inject(SupabaseService).client;
  private db = inject(OrderDatabase);
  private platformId = inject(PLATFORM_ID);

  // 🔥 STATE 
  creating = signal(false); 
  syncing = signal(false); 
  error = signal<string | null>(null); 
  lastOrder = signal<{ order_id: number; total: number } | null>(null); 

  orders = signal<any[]>([]); 
  loadingOrders = signal(false); 

  // 🛒 CART 
  cart = signal<OrderCreateItem[]>([]); 
  cartCount = computed(() => 
    this.cart().reduce((acc, i) => acc + i.cantidad, 0) 
  ); 

  // 🌐 NETWORK 
  isOnline = signal(true); 
  private channel: any = null;

  constructor() { 
    if (isPlatformBrowser(this.platformId)) { 
      this.isOnline.set(navigator.onLine); 

      window.addEventListener('online', () => { 
        this.isOnline.set(true); 
        this.syncQueue(); 
      }); 

      window.addEventListener('offline', () => { 
        this.isOnline.set(false); 
      }); 

      // sync inicial 
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
          tipos_servicio (nombre)
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
        ...o,
        cliente_nombre: o.clientes?.nombre || 'Consumidor Final',
        tipo_servicio_nombre: o.tipos_servicio?.nombre || 'N/A'
      })));
    } catch (e: any) {
      console.error('Error cargando órdenes:', e);
      this.error.set(e?.message ?? 'Error cargando órdenes');
    } finally {
      this.loadingOrders.set(false);
    }
  }

  // ========================= 
  // 🧾 CREATE ORDER (CORE) 
  // ========================= 
  async createOrder(dto: OrderCreateDto): Promise<OrderCreateResponse> { 
    this.creating.set(true); 
    this.error.set(null); 
 
    // 1. Guardar SIEMPRE local 
    await this.db.save({ 
      id: dto.client_request_id, 
      status: 'pending', 
      payload: dto, 
      createdAt: Date.now() 
    }); 
 
    // 2. Intentar enviar si hay conexión 
    if (this.isOnline()) { 
      try { 
        const res = await this.sendToServer(dto); 
 
        if (res?.status === 'success' || res?.status === 'conflict') { 
          await this.db.markSynced(dto.client_request_id); 
          this.lastOrder.set({ order_id: res.order_id, total: res.total }); 
          
          // Side-effects: Tickets
          this.supabase.from('tickets').insert({
            order_id: res.order_id,
            tipo: dto.tipo_servicio_id === 1 ? 'ticket_llevar' : 'ticket_cocina',
            impreso: false
          }).then(({ error: te }) => { if (te) console.error(te); });

          return res; 
        } 
 
        return res; 
      } catch (e: any) { 
        this.error.set('Se guardó offline. Se sincronizará automáticamente.'); 
      } 
    } 
 
    return { status: 'success', order_id: 0, total: 0 } as any; 
  } 
 
  // ========================= 
  // 🔁 SYNC QUEUE 
  // ========================= 
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
 
  // ========================= 
  // 🌐 API CALL 
  // ========================= 
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

    // Update nota_general if present
    if (data?.status === 'success' && dto.nota_general) {
      await this.supabase.from('orders').update({ nota_general: dto.nota_general }).eq('id', data.order_id);
    }

    return data; 
  } 

  // ========================= 
  // 🛒 CART (LIMPIO) 
  // ========================= 
  addProduct(product: any) { 
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

  addVariant(variant: any, product: any) {
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
            this.orders.set([payload.new, ...current]);
          } else if (payload.eventType === 'UPDATE') {
            this.orders.set(
              current.map((o: any) => (o.id === payload.new?.id ? payload.new : o)),
            );
          } else if (payload.eventType === 'DELETE') {
            this.orders.set(current.filter((o: any) => o.id !== payload.old?.id));
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
