import { Injectable, inject, signal, computed, PLATFORM_ID, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { OrdersRequestsApi } from '../api/orders-requests.api';
import { LoggerService } from './logger.service';
import { PaymentMethod } from '../models/order.model';

export interface OrderRequestItemModifier {
  id: number;
  nombre_modificador: string;
  cantidad: number;
  precio_unitario: number;
}

export interface OrderRequestItem {
  id: number;
  producto_id: number | null;
  variante_id: number | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  nota: string | null;
  order_request_item_modificadores: OrderRequestItemModifier[];
}

export interface OrderRequest {
  id: number;
  request_code: string;
  cliente_id: number | null;
  estado: 'pending' | 'accepted' | 'rejected' | 'expired';
  total: number;
  nota_general: string | null;
  tipo_servicio_id: number | null;
  numero_mesa: string | null;
  direccion_entrega: string | null;
  referencias?: string | null;
  motivo_rechazo: string | null;
  created_at: string;
  accepted_at: string | null;
  metodo_pago_id?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  metodos_pago?: {
    id: number;
    nombre: string;
  } | null;
  clientes: {
    id: number;
    nombre: string;
    telefono: string;
    email: string | null;
    direccion: string | null;
  } | null;
  tipos_servicio: {
    nombre: string;
  } | null;
  order_request_items: OrderRequestItem[];
}

@Injectable({ providedIn: 'root' })
export class OrdersRequestsService {
  private readonly api = inject(OrdersRequestsApi);
  private readonly logger = inject(LoggerService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly requests = signal<OrderRequest[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed signals
  readonly allRequests = this.requests.asReadonly();
  
  readonly pendingRequests = computed(() => 
    this.requests().filter(r => r.estado === 'pending')
  );

  readonly pendingCount = computed(() => this.pendingRequests().length);

  private channel: any = null;

  // Realtime subscription setup
  subscribeRealtime() {
    if (this.channel || !isPlatformBrowser(this.platformId)) return;

    this.channel = this.api.getRealtimeChannel()
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_requests' }, async (payload: any) => {
        this.logger.info('Order request realtime event received', payload.eventType, 'OrdersRequestsService');
        
        if (payload.eventType === 'INSERT') {
          // A new request has been created! Fetch its details and add to state.
          await this.loadRequestAndAddToState(payload.new.id, true);
        } else if (payload.eventType === 'UPDATE') {
          // A request has been updated. Update its state in the list.
          const updated = payload.new as OrderRequest;
          
          // Since details (items, client etc) aren't in payload.new directly,
          // it's safest to re-fetch the single request to have all populated fields.
          await this.loadRequestAndAddToState(updated.id, false);
        } else if (payload.eventType === 'DELETE') {
          this.requests.update(list => list.filter(r => r.id !== payload.old?.id));
        }
      })
      .subscribe();
  }

  unsubscribeRealtime() {
    if (this.channel) {
      this.api.removeRealtimeChannel(this.channel);
      this.channel = null;
    }
  }

  // Load payment methods catalog
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await this.api.getPaymentMethods();
      if (error) throw error;
      return (data as PaymentMethod[]) ?? [];
    } catch (err: any) {
      this.logger.error('Error loading payment methods', err, 'OrdersRequestsService');
      throw err;
    }
  }

  // Load all requests (optionally filtered by state)
  async loadRequests(status?: string) {
    try {
      this.loading.set(true);
      this.error.set(null);
      let res = await this.api.getRequestsQuery(status, true);
      if (res.error && res.error.message?.includes('referencias')) {
        res = await this.api.getRequestsQuery(status, false);
      }
      if (res.error) throw res.error;

      this.requests.set((res.data || []) as unknown as OrderRequest[]);
    } catch (err: any) {
      this.logger.error('Error loading order requests', err, 'OrdersRequestsService');
      this.error.set(err.message || 'Error al cargar las solicitudes');
    } finally {
      this.loading.set(false);
    }
  }

  // Load a single request detail and insert/update in state
  private async loadRequestAndAddToState(requestId: number, playSound: boolean) {
    try {
      let res = await this.api.getRequestsQuery(undefined, true).eq('id', requestId).maybeSingle();
      if (res.error && res.error.message?.includes('referencias')) {
        res = await this.api.getRequestsQuery(undefined, false).eq('id', requestId).maybeSingle();
      }
      if (res.error) throw res.error;
      if (!res.data) return;

      const typedReq = res.data as unknown as OrderRequest;

      this.requests.update(list => {
        const index = list.findIndex(r => r.id === requestId);
        if (index > -1) {
          const updatedList = [...list];
          updatedList[index] = typedReq;
          return updatedList;
        } else {
          if (playSound && typedReq.estado === 'pending') {
            this.playNotificationSound();
          }
          return [typedReq, ...list];
        }
      });
    } catch (err) {
      this.logger.error(`Error loading single request ${requestId}`, err, 'OrdersRequestsService');
    }
  }

  // Submit a new request from the public menu
  async submitRequest(payload: {
    clientInfo?: { nombre?: string; telefono?: string; email?: string; direccion?: string };
    tipo_servicio_id: number;
    numero_mesa?: string | null;
    direccion_entrega?: string | null;
    referencias?: string | null;
    nota_general?: string | null;
    metodo_pago?: string | null;
    location?: { latitude: number; longitude: number; accuracy?: number } | null;
    items: any[];
  }) {
    try {
      this.loading.set(true);
      this.error.set(null);

      // 1. Search or create client only if phone is provided
      let clienteId: number | null = null;
      const phone = payload.clientInfo?.telefono?.trim();

      if (phone) {
        const { data: existingClient, error: clientFindError } = await this.api.findClientByPhone(phone);
        if (clientFindError) throw clientFindError;

        if (existingClient) {
          clienteId = existingClient.id;
          const updates: any = {};
          if (payload.clientInfo?.nombre && payload.clientInfo.nombre !== existingClient.nombre) {
            updates.nombre = payload.clientInfo.nombre;
          }
          if (payload.clientInfo?.email && payload.clientInfo.email !== existingClient.email) {
            updates.email = payload.clientInfo.email;
          }
          if (payload.clientInfo?.direccion && payload.clientInfo.direccion !== existingClient.direccion) {
            updates.direccion = payload.clientInfo.direccion;
          }
          if (Object.keys(updates).length > 0) {
            await this.api.updateClient(existingClient.id, updates);
          }
        } else {
          const { data: newClient, error: clientCreateError } = await this.api.createClient({
            nombre: payload.clientInfo?.nombre || 'Cliente',
            telefono: phone,
            email: payload.clientInfo?.email,
            direccion: payload.clientInfo?.direccion
          });
          if (clientCreateError) throw clientCreateError;
          clienteId = newClient.id;
        }
      }

      // Calculate total amount from items
      const totalAmount = payload.items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

      // Prepare clean physical delivery address and dedicated delivery references (NO string mixing, NO GPS strings)
      const finalAddress = payload.direccion_entrega?.trim() || null;
      const finalReferencias = payload.referencias?.trim() || null;

      // Prepare 100% human-readable kitchen note (NO stringified metadata JSON)
      let finalNote = payload.nota_general?.trim() || '';
      if (payload.clientInfo?.nombre && !phone) {
        finalNote = `Cliente: ${payload.clientInfo.nombre}${finalNote ? ' | ' + finalNote : ''}`;
      }

      // Resolve native metodo_pago_id directly from catalog
      let resolvedPaymentMethodId: number | null = null;
      if (payload.metodo_pago) {
        try {
          const methods = await this.getPaymentMethods();
          if (methods && methods.length > 0) {
            const p = payload.metodo_pago.toLowerCase();
            if (p.includes('efectivo') || p === 'cash') {
              const match = methods.find(m => m.nombre.toLowerCase().includes('efectivo'));
              if (match) resolvedPaymentMethodId = match.id;
            } else if (p.includes('tarjeta') || p.includes('terminal') || p === 'card') {
              const match = methods.find(m => m.nombre.toLowerCase().includes('tarjeta') || m.nombre.toLowerCase().includes('terminal'));
              if (match) resolvedPaymentMethodId = match.id;
            } else if (p.includes('transferencia') || p.includes('spei') || p === 'transfer') {
              const match = methods.find(m => m.nombre.toLowerCase().includes('transferencia') || m.nombre.toLowerCase().includes('spei'));
              if (match) resolvedPaymentMethodId = match.id;
            }
          }
        } catch {
          this.logger.warn('Could not resolve payment method id from catalog', 'OrdersRequestsService');
        }
      }

      // 2. Create order request
      const { data: request, error: requestCreateError } = await this.api.createOrderRequest({
        cliente_id: clienteId,
        total: totalAmount,
        nota_general: finalNote || null,
        tipo_servicio_id: payload.tipo_servicio_id,
        numero_mesa: payload.numero_mesa || null,
        direccion_entrega: finalAddress,
        referencias: finalReferencias,
        metodo_pago_id: resolvedPaymentMethodId,
        latitude: payload.location?.latitude ?? null,
        longitude: payload.location?.longitude ?? null,
        accuracy: payload.location?.accuracy ?? null,
        estado: 'pending'
      });
      if (requestCreateError) throw requestCreateError;

      // 3. Insert items
      const itemsToInsert = payload.items.map(item => {
        const unitPrice = item.precio_unitario ?? item.precio ?? 0;
        return {
          request_id: request.id,
          producto_id: item.producto_id ?? item.product_id ?? null,
          variante_id: item.variante_id ?? item.variante?.id ?? null,
          nombre_producto: item.nombre_producto ?? item.nombre,
          cantidad: item.cantidad,
          precio_unitario: unitPrice,
          total: unitPrice * item.cantidad,
          nota: item.nota || null
        };
      });

      const { data: insertedItems, error: itemsInsertError } = await this.api.insertRequestItems(itemsToInsert);
      if (itemsInsertError) throw itemsInsertError;

      // 4. Relational insert for item modifiers into order_request_item_modificadores
      if (insertedItems && insertedItems.length > 0) {
        const modifiersToInsert: any[] = [];
        insertedItems.forEach((dbItem: any, index: number) => {
          const originalItem = payload.items[index];
          if (originalItem?.modificadores && Array.isArray(originalItem.modificadores) && originalItem.modificadores.length > 0) {
            originalItem.modificadores.forEach((m: any) => {
              if (!m.nombre_modificador) return;
              modifiersToInsert.push({
                request_item_id: dbItem.id,
                modificador_id: m.modificador_id ? Number(m.modificador_id) : null,
                nombre_modificador: m.nombre_modificador,
                cantidad: Number(m.cantidad || 1),
                precio_unitario: Number(m.precio_unitario || 0)
              });
            });
          }
        });

        if (modifiersToInsert.length > 0) {
          await this.api.insertRequestItemModifiers(modifiersToInsert);
        }
      }

      return { success: true, request_code: request.request_code };
    } catch (err: any) {
      this.logger.error('Error submitting order request', err, 'OrdersRequestsService');
      this.error.set(err.message || 'Error al procesar el pedido');
      return { success: false, error: err.message };
    } finally {
      this.loading.set(false);
    }
  }

  // Accept a request (atomic conversion to order via RPC)
  async acceptRequest(requestId: number | string, paymentMethodId: number | string, shiftId: number | string | null) {
    try {
      this.loading.set(true);
      this.error.set(null);

      const { data, error } = await this.api.acceptOrderRequest(requestId, paymentMethodId, shiftId);
      if (error) throw error;

      if (data?.status === 'success') {
        // Update local state state to accepted
        this.requests.update(list => list.map(r => r.id === requestId ? { ...r, estado: 'accepted' as const, accepted_at: new Date().toISOString() } : r));
        return { success: true, order_id: data.order_id, numero_orden: data.numero_orden };
      } else {
        throw new Error(data?.message || 'Error al procesar la aceptación de la solicitud');
      }
    } catch (err: any) {
      this.logger.error('Error accepting request', err, 'OrdersRequestsService');
      this.error.set(err.message || 'Error al aceptar la solicitud');
      return { success: false, error: err.message };
    } finally {
      this.loading.set(false);
    }
  }

  // Reject a request
  async rejectRequest(requestId: number | string, reason: string) {
    try {
      this.loading.set(true);
      this.error.set(null);

      const { error } = await this.api.rejectOrderRequest(requestId, reason);
      if (error) throw error;

      this.requests.update(list => list.map(r => r.id === requestId ? { ...r, estado: 'rejected' as const, motivo_rechazo: reason } : r));
      return { success: true };
    } catch (err: any) {
      this.logger.error('Error rejecting request', err, 'OrdersRequestsService');
      this.error.set(err.message || 'Error al rechazar la solicitud');
      return { success: false, error: err.message };
    } finally {
      this.loading.set(false);
    }
  }

  // Synthesize a nice "ding-dong" bell sound using the Web Audio API (cross-platform, zero dependencies)
  private playNotificationSound() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      
      // Tone 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.15, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      // Tone 2: A5 (880.00 Hz) slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.55);
      
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);
      
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.55);
    } catch (e) {
      this.logger.warn('Could not play synthesized notification sound', e);
    }
  }
}
