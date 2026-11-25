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

  // Submit a new request from the public menu via atomic RPC create_public_order_request_v1
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
  }): Promise<{ success: boolean; request_code?: string; request_id?: number; total?: number; error?: string; error_code?: string }> {
    try {
      this.loading.set(true);
      this.error.set(null);

      // 1. Resolve native metodo_pago_id directly from catalog
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

      // 2. Normalize items & modifiers from PublicCartService / CustomizationStore / PublicCheckout
      const normalizedItems = (payload.items || []).map(item => {
        const rawProdId = item?.producto_id ?? item?.product_id ?? item?.product?.id ?? null;
        const parsedProdId = rawProdId !== null && rawProdId !== '' && Number.isFinite(Number(rawProdId))
          ? Number(rawProdId)
          : null;

        const rawVarId = item?.variante_id ?? item?.variante?.id ?? item?.variant?.id ?? null;
        const parsedVarId = rawVarId !== null && rawVarId !== '' && Number.isFinite(Number(rawVarId))
          ? Number(rawVarId)
          : null;

        const rawMods = Array.isArray(item?.modificadores)
          ? item.modificadores
          : (Array.isArray(item?.modifiers) ? item.modifiers : []);

        const normalizedMods = rawMods
          .map((m: any) => {
            const rawModId = m?.modificador_id ?? m?.modifierId ?? m?.id ?? null;
            const parsedModId = rawModId !== null && rawModId !== '' && Number.isFinite(Number(rawModId)) && Number(rawModId) > 0
              ? Number(rawModId)
              : null;
            const nombreMod = String(m?.nombre_modificador ?? m?.nombre ?? '').trim();
            return {
              modificador_id: parsedModId,
              nombre_modificador: nombreMod,
              cantidad: Number(m?.cantidad ?? m?.qty ?? 1),
              precio_unitario: Number(m?.precio_unitario ?? m?.precioUnitario ?? m?.precio ?? 0)
            };
          })
          .filter((m: any) => m.modificador_id !== null || m.nombre_modificador.length > 0);

        return {
          producto_id: parsedProdId,
          variante_id: parsedVarId,
          nombre_producto: String(item?.nombre_producto ?? item?.nombre ?? item?.product?.nombre ?? '').trim(),
          cantidad: Number(item?.cantidad ?? item?.quantity ?? 1),
          nota: item?.nota?.trim() || item?.note?.trim() || null,
          modificadores: normalizedMods
        };
      });

      // 3. Single atomic RPC call to create_public_order_request_v1
      const { data: rpcRes, error: rpcError } = await this.api.createPublicOrderRequest({
        p_client_info: {
          nombre: payload.clientInfo?.nombre?.trim() || null,
          telefono: payload.clientInfo?.telefono?.trim() || null,
          email: payload.clientInfo?.email?.trim() || null,
          direccion: payload.clientInfo?.direccion?.trim() || null
        },
        p_tipo_servicio_id: Number(payload.tipo_servicio_id),
        p_numero_mesa: payload.numero_mesa?.trim() || null,
        p_direccion_entrega: payload.direccion_entrega?.trim() || null,
        p_referencias: payload.referencias?.trim() || null,
        p_nota_general: payload.nota_general?.trim() || null,
        p_metodo_pago_id: resolvedPaymentMethodId,
        p_location: payload.location
          ? {
              latitude: Number(payload.location.latitude),
              longitude: Number(payload.location.longitude),
              ...(payload.location.accuracy !== undefined && payload.location.accuracy !== null
                ? { accuracy: Number(payload.location.accuracy) }
                : {})
            }
          : null,
        p_items: normalizedItems
      });

      if (rpcError) {
        const friendlyMsg = this.mapPublicOrderRpcError(rpcError.code, rpcError.message);
        this.error.set(friendlyMsg);
        return { success: false, error: friendlyMsg, error_code: rpcError.code };
      }

      if (!rpcRes || rpcRes.status !== 'success' || !rpcRes.request_code) {
        const friendlyMsg = this.mapPublicOrderRpcError(rpcRes?.error_code, rpcRes?.message);
        this.error.set(friendlyMsg);
        return {
          success: false,
          error: friendlyMsg,
          error_code: rpcRes?.error_code
        };
      }

      return {
        success: true,
        request_code: rpcRes.request_code,
        request_id: rpcRes.request_id,
        total: Number(rpcRes.total ?? 0)
      };
    } catch (err: any) {
      this.logger.error('Error submitting order request', err, 'OrdersRequestsService');
      const friendlyMsg = this.mapPublicOrderRpcError(err?.error_code || err?.code, err?.message);
      this.error.set(friendlyMsg);
      return { success: false, error: friendlyMsg };
    } finally {
      this.loading.set(false);
    }
  }

  private mapPublicOrderRpcError(errorCode?: string, fallbackMessage?: string): string {
    switch (errorCode) {
      case 'EMPTY_ORDER':
      case 'INVALID_ITEMS':
      case 'INVALID_ITEM_FORMAT':
        return 'Tu carrito está vacío o contiene productos con formato inválido.';
      case 'MAX_ITEMS_EXCEEDED':
        return 'Tu pedido supera el límite máximo permitido de 30 productos distintos por solicitud.';
      case 'INVALID_QUANTITY':
        return 'La cantidad por producto debe estar entre 1 y 25 unidades.';
      case 'MAX_MODIFIERS_EXCEEDED':
      case 'MODIFIER_MAX_EXCEEDED':
      case 'INVALID_MODIFIER_QUANTITY':
      case 'INVALID_MODIFIERS_FORMAT':
        return 'Una de las opciones adicionales seleccionadas excede la cantidad máxima permitida.';
      case 'INVALID_PHONE':
        return 'El formato del número de teléfono no es válido. Ingresa entre 7 y 15 dígitos.';
      case 'INVALID_INPUT_LENGTH':
        return 'Uno de los campos de texto o notas es demasiado largo. Por favor acórtalo e intenta de nuevo.';
      case 'INVALID_SERVICE_TYPE':
        return 'El tipo de servicio seleccionado no es válido.';
      case 'INVALID_PAYMENT_METHOD':
        return 'El método de pago seleccionado no es válido.';
      case 'INVALID_LOCATION':
        return 'Las coordenadas GPS de entrega no son válidas. Intenta actualizar tu ubicación.';
      case 'VARIANT_REQUIRED':
        return 'Selecciona una presentación o tamaño válido para el producto.';
      case 'PRODUCT_NOT_AVAILABLE':
        return 'Uno o más productos de tu carrito se acaban de agotar o ya no están disponibles.';
      case 'MODIFIER_NOT_AVAILABLE':
        return 'Una o más opciones adicionales seleccionadas ya no están disponibles para ese producto.';
      default:
        return fallbackMessage || 'No se pudo procesar tu pedido en este momento. Intenta nuevamente.';
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
