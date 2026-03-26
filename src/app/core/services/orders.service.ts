import { Injectable, inject, signal, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { OrderCreateDto, OrderCreateResponse, OrderCreateItem } from '../../core/models/order.model';
import { orderDb } from './order-db.service';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private supabase = inject(SupabaseService).client;
  private platformId = inject(PLATFORM_ID);

  creating = signal(false);
  lastOrder = signal<{ order_id: number; total: number } | null>(null);
  error = signal<string | null>(null);
  orders = signal<any[]>([]);
  loadingOrders = signal(false);
  
  // Cart State
  cart = signal<OrderCreateItem[]>([]);
  editingOrderId = signal<number | string | null>(null);

  // Computed Cart Stats
  cartCount = computed(() => this.cart().reduce((acc, item) => acc + item.cantidad, 0));
  
  // Note: Prices are not in OrderCreateItem but we could add them to calculate totals
  // For now, these basic signals improve reactivity

  private channel: any = null;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('online', () => this.retryQueued());
      // Reintento inicial al cargar
      setTimeout(() => this.retryQueued(), 5000);
    }
  }

  async loadOrders(dateFilter?: { start: string; end: string }): Promise<void> {
    try {
      this.loadingOrders.set(true);
      
      // Optimizamos la consulta para traer solo lo necesario y con joins eficientes
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
        query = query
          .gte('fecha_creacion', dateFilter.start)
          .lte('fecha_creacion', dateFilter.end);
      } else {
        query = query.limit(100); // Reducimos el límite inicial para mayor rapidez
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Mapeo simple para evitar cálculos pesados en el template
      const mappedOrders = (data || []).map((o: any) => ({
        ...o,
        cliente_nombre: o.clientes?.nombre || 'Consumidor Final',
        tipo_servicio_nombre: o.tipos_servicio?.nombre || 'N/A'
      }));

      this.orders.set(mappedOrders);
    } catch (e: any) {
      console.error('Error cargando órdenes:', e);
      this.error.set(e?.message ?? 'Error cargando órdenes');
    } finally {
      this.loadingOrders.set(false);
    }
  }

  addProduct(product: any) {
    const items = this.cart();
    const existingIndex = items.findIndex(i => i.producto_id === product.id && !i.variante_id);
    
    if (existingIndex !== -1) {
      const updatedItems = items.map((item, index) => 
        index === existingIndex 
          ? { ...item, cantidad: item.cantidad + 1 } 
          : item
      );
      this.cart.set(updatedItems);
    } else {
      this.cart.set([...items, {
        producto_id: product.id,
        nombre_producto: product.nombre,
        cantidad: 1,
        modificadores: []
      }]);
    }
  }

  addVariant(variant: any, product: any) {
    const items = this.cart();
    const existingIndex = items.findIndex(i => i.variante_id === variant.id);
    
    if (existingIndex !== -1) {
      const updatedItems = items.map((item, index) => 
        index === existingIndex 
          ? { ...item, cantidad: item.cantidad + 1 } 
          : item
      );
      this.cart.set(updatedItems);
    } else {
      this.cart.set([...items, {
        variante_id: variant.id,
        producto_id: product.id,
        nombre_producto: `${product.nombre} - ${variant.nombre}`,
        cantidad: 1,
        modificadores: []
      }]);
    }
  }

  increment(item: OrderCreateItem) {
    const updatedItems = this.cart().map(i => 
      i === item ? { ...i, cantidad: i.cantidad + 1 } : i
    );
    this.cart.set(updatedItems);
  }

  decrement(item: OrderCreateItem) {
    if (item.cantidad > 1) {
      const updatedItems = this.cart().map(i => 
        i === item ? { ...i, cantidad: i.cantidad - 1 } : i
      );
      this.cart.set(updatedItems);
    } else {
      this.remove(item);
    }
  }

  remove(item: OrderCreateItem) {
    this.cart.set(this.cart().filter(i => i !== item));
  }

  clearCart() {
    this.cart.set([]);
  }

  async createOrder(dto: OrderCreateDto): Promise<OrderCreateResponse> {
    try {
      this.creating.set(true);
      this.error.set(null);

      // Paso 1: Guardar localmente siempre primero (IndexedDB)
      if (isPlatformBrowser(this.platformId)) {
        await orderDb.saveOrder({
          id: dto.client_request_id,
          status: 'pending',
          payload: dto,
          createdAt: Date.now()
        });
      }

      const { data, error } = await this.supabase.rpc('orders_create_v1', {
        p_client_request_id: dto.client_request_id,
        p_cliente_id: dto.cliente_id ?? null,
        p_items: dto.items,
        p_metodo_pago_id: dto.metodo_pago_id,
        p_propina: dto.propina ?? 0,
        p_tipo_servicio_id: dto.tipo_servicio_id,
        p_turno_id: dto.turno_id ?? null
      });

      if (error) {
        console.error('Error RPC:', error);
        // Si es error de red, la orden ya está en IndexedDB como 'pending'
        throw error;
      }

      if (data?.status === 'success') {
        // Paso 2: Marcar como sincronizada
        if (isPlatformBrowser(this.platformId)) {
          await orderDb.saveOrder({
            id: dto.client_request_id,
            status: 'synced',
            payload: dto,
            createdAt: Date.now()
          });
        }

        this.lastOrder.set({ order_id: data.order_id, total: data.total });
        
        // Ticket y nota general (se mantienen igual)
        if (dto.nota_general) {
          await this.supabase.from('orders').update({ nota_general: dto.nota_general }).eq('id', data.order_id);
        }

        this.supabase.from('tickets').insert({
          order_id: data.order_id,
          tipo: dto.tipo_servicio_id === 1 ? 'ticket_llevar' : 'ticket_cocina',
          impreso: false
        }).then(({ error: te }) => { if (te) console.error(te); });

        return data as OrderCreateResponse;
      }

      return data as OrderCreateResponse;

    } catch (e: any) {
      console.error('createOrder error:', e);
      const isNetworkError = !navigator.onLine || e.message?.includes('fetch') || e.code === 'PGRST301';
      
      if (isNetworkError) {
        this.error.set('Sin conexión. La orden se guardó localmente y se enviará al recuperar internet.');
        return { status: 'success', order_id: 0, total: 0 } as any; // Retornamos éxito falso para UI
      }

      this.error.set(e.message || 'Error desconocido');
      return { status: 'validation_error', error_code: 'SERVICE_TYPE_INVALID' } as any;
    } finally {
      this.creating.set(false);
    }
  }

  async retryQueued(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || !navigator.onLine) return;
    
    const pending = await orderDb.getPendingOrders();
    if (pending.length === 0) return;

    console.log(`Reintentando ${pending.length} órdenes pendientes...`);

    for (const order of pending) {
      try {
        const { data, error } = await this.supabase.rpc('orders_create_v1', {
          p_client_request_id: order.payload.client_request_id,
          p_cliente_id: order.payload.cliente_id ?? null,
          p_items: order.payload.items,
          p_metodo_pago_id: order.payload.metodo_pago_id,
          p_propina: order.payload.propina ?? 0,
          p_tipo_servicio_id: order.payload.tipo_servicio_id,
          p_turno_id: order.payload.turno_id ?? null
        });

        if (!error && (data?.status === 'success' || data?.error_code === 'IDEMPOTENCY_CONFLICT')) {
          await orderDb.saveOrder({ ...order, status: 'synced' });
          console.log(`Orden ${order.id} sincronizada.`);
        }
      } catch (e) {
        console.error(`Error reintentando orden ${order.id}:`, e);
      }
    }
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

  // Métodos antiguos de localStorage (limpieza opcional después)
  getQueued(): OrderCreateDto[] { return []; }
  private setQueued(items: OrderCreateDto[]) {}
  private enqueue(dto: OrderCreateDto) {}
}
