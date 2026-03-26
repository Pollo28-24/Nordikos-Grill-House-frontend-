import { Injectable, inject, signal, PLATFORM_ID, computed } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { OrderCreateDto, OrderCreateResponse, OrderCreateItem } from '../../core/models/order.model';

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

  private queueKey = 'orders_queue_v1';
  private channel: any = null;

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

      const DEBUG = true;
      if (DEBUG) {
        console.group('orders.createOrder');
        console.log('dto', dto);
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

      if (data?.status === 'success' && dto.nota_general) {
        // Si la orden se creó con éxito pero la función RPC no soporta nota_general,
        // la actualizamos en un paso separado
        await this.supabase
          .from('orders')
          .update({ nota_general: dto.nota_general })
          .eq('id', data.order_id);
      }

      if (DEBUG) {
        console.log('rpc.orders_create_v1.response', { data, error });
      }

      if (error) {
        // Log error details for debugging
        console.error('rpc.orders_create_v1.error', error);
        this.error.set(error.message ?? 'Error creando orden');
        
        // Network/offline heuristics
        const isOffline = !navigator.onLine || String(error?.message || '').toLowerCase().includes('fetch') || String(error?.message || '').toLowerCase().includes('network');
        if (isOffline) {
          this.enqueue(dto);
        }
        
        if (DEBUG) console.groupEnd();
        return { status: 'validation_error', error_code: 'SERVICE_TYPE_INVALID' } as any;
      }

      if (data?.status === 'success') {
        this.lastOrder.set({ order_id: data.order_id, total: data.total });
        
        // Generación de ticket asincrónico (side-effect)
        this.supabase.from('tickets').insert({
          order_id: data.order_id,
          tipo: dto.tipo_servicio_id === 1 ? 'ticket_llevar' : 'ticket_cocina',
          impreso: false
        }).then(({ error: ticketError }) => {
          if (ticketError) console.error('Error al encolar ticket:', ticketError);
        });
      }
      if (DEBUG) {
        console.groupEnd();
      }
      return data as OrderCreateResponse;
    } catch (e: any) {
      const DEBUG = true;
      if (DEBUG) {
        console.error('orders.createOrder.exception', e);
      }
      const isOffline = !navigator.onLine || String(e?.message || '').toLowerCase().includes('fetch') || String(e?.message || '').toLowerCase().includes('network');
      if (isOffline) {
        this.enqueue(dto);
        return { status: 'validation_error', error_code: 'SERVICE_TYPE_INVALID' } as any;
      }
      this.error.set(e?.message ?? 'Error creando orden');
      return { status: 'validation_error', error_code: 'SERVICE_TYPE_INVALID' } as any;
    } finally {
      this.creating.set(false);
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

  getQueued(): OrderCreateDto[] {
    if (!isPlatformBrowser(this.platformId)) return [];
    try {
      const DEBUG = true;
      const raw = localStorage.getItem(this.queueKey);
      if (DEBUG) {
        console.log('orders.queue.get', raw);
      }
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private setQueued(items: OrderCreateDto[]) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(items));
      const DEBUG = true;
      if (DEBUG) {
        console.log('orders.queue.set', items?.length || 0);
      }
    } catch {}
  }

  private enqueue(dto: OrderCreateDto) {
    const items = this.getQueued();
    items.push(dto);
    this.setQueued(items);
    const DEBUG = true;
    if (DEBUG) {
      console.log('orders.queue.enqueue', dto.client_request_id);
    }
  }

  async retryQueued(): Promise<void> {
    const items = this.getQueued();
    if (!items.length) return;
    const DEBUG = true;
    if (DEBUG) {
      console.group('orders.queue.retry');
      console.log('count', items.length);
    }
    const remaining: OrderCreateDto[] = [];
    for (const dto of items) {
      try {
        const res = await this.createOrder(dto);
        if (res?.status !== 'success' && res?.error_code !== 'IDEMPOTENCY_CONFLICT') {
          remaining.push(dto);
        }
      } catch {
        remaining.push(dto);
      }
    }
    this.setQueued(remaining);
    if (DEBUG) {
      console.log('remaining', remaining.length);
      console.groupEnd();
    }
  }
}
