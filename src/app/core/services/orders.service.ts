import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../../shared/data-access/supabase.service';
import { OrderCreateDto, OrderCreateResponse } from '../../core/models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private supabase = inject(SupabaseService).client;

  creating = signal(false);
  lastOrder = signal<{ order_id: number; total: number } | null>(null);
  error = signal<string | null>(null);
  orders = signal<any[]>([]);
  loadingOrders = signal(false);

  private queueKey = 'orders_queue_v1';

  async loadOrders(): Promise<void> {
    try {
      this.loadingOrders.set(true);
      const { data, error } = await this.supabase
        .from('orders')
        .select('id, fecha_creacion, total, estado_pedido, estado_pago, metodo_pago_id, tipo_servicio_id, turno_id')
        .order('fecha_creacion', { ascending: false })
        .limit(200);
      if (error) throw error;
      this.orders.set(data ?? []);
    } catch (e: any) {
      this.error.set(e?.message ?? 'Error cargando órdenes');
    } finally {
      this.loadingOrders.set(false);
    }
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
        p_cliente_id: dto.cliente_id ?? null,
        p_metodo_pago_id: dto.metodo_pago_id,
        p_tipo_servicio_id: dto.tipo_servicio_id,
        p_turno_id: dto.turno_id,
        p_propina: dto.propina ?? 0,
        p_client_request_id: dto.client_request_id,
        p_items: dto.items
      });

      if (DEBUG) {
        console.log('rpc.orders_create_v1.response', { data, error });
      }

      if (error) {
        // Fallback: si la función instalada aún usa firma simplificada (in_client_request_id, in_items)
        const code = String((error as any)?.code || '');
        const msg = String(error?.message || '').toLowerCase();
        const det = String(error?.details || '').toLowerCase();
        const notFound =
          code === '404' ||
          code === 'PGRST202' ||
          msg.includes('not found') ||
          det.includes('not found') ||
          msg.includes('could not find the function') ||
          det.includes('could not find the function');
        if (notFound) {
          if (DEBUG) {
            console.warn('rpc.orders_create_v1 not found, trying fallback signature');
          }
          const fb = await this.supabase.rpc('orders_create_v1', {
            in_client_request_id: dto.client_request_id,
            in_items: dto.items
          } as any);
          if (DEBUG) {
            console.log('rpc.orders_create_v1.fallback.response', fb);
          }
          if (!fb.error && typeof fb.data === 'number') {
            const orderId = fb.data as number;
            this.lastOrder.set({ order_id: orderId, total: 0 });
            if (DEBUG) {
              console.groupEnd();
            }
            return { status: 'success', order_id: orderId, total: 0 };
          } else {
            if (DEBUG) {
              console.error('rpc.orders_create_v1.fallback.error', fb.error);
            }
          }
        }
        // Network/offline heuristics
        const isOffline = !navigator.onLine || String(error?.message || '').toLowerCase().includes('fetch') || String(error?.message || '').toLowerCase().includes('network');
        if (isOffline) {
          if (DEBUG) {
            console.warn('network/offline detected, enqueue order', { error });
          }
          this.enqueue(dto);
          if (DEBUG) {
            console.groupEnd();
          }
          return { status: 'validation_error', error_code: 'SERVICE_TYPE_INVALID' } as any;
        }
        this.error.set(error.message ?? 'Error creando orden');
        if (DEBUG) {
          console.error('rpc.orders_create_v1.error', error);
          console.groupEnd();
        }
        return { status: 'validation_error', error_code: 'SERVICE_TYPE_INVALID' } as any;
      }

      if (data?.status === 'success') {
        this.lastOrder.set({ order_id: data.order_id, total: data.total });
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

  getQueued(): OrderCreateDto[] {
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
