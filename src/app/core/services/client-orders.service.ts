import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ClientSubmittedOrder, CustomerProfile, OrderRequestLocation } from '../models/order.model';
import { getGoogleMapsUrl } from '../utils/order-location.utils';

@Injectable({
  providedIn: 'root'
})
export class ClientOrdersService {
  private platformId = inject(PLATFORM_ID);

  private readonly ORDERS_KEY = 'nordikos_client_orders';
  private readonly PROFILE_KEY = 'nordikos_customer_profile';

  private _orders = signal<ClientSubmittedOrder[]>([]);
  readonly orders = this._orders.asReadonly();
  readonly hasOrders = computed(() => this._orders().length > 0);
  readonly ordersCount = computed(() => this._orders().length);

  constructor() {
    this.loadOrders();
  }

  loadOrders() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const saved = localStorage.getItem(this.ORDERS_KEY);
      if (saved) {
        const parsed: ClientSubmittedOrder[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          this._orders.set(parsed);
        }
      }
    } catch (e) {
      console.warn('Error al cargar historial de pedidos locales:', e);
    }
  }

  addOrder(order: ClientSubmittedOrder) {
    // Agregamos al inicio para que el pedido más reciente aparezca primero
    const updated = [order, ...this._orders().filter(o => o.request_code !== order.request_code)];
    // Limitamos a los últimos 30 pedidos para no saturar localStorage
    const trimmed = updated.slice(0, 30);
    this._orders.set(trimmed);

    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.ORDERS_KEY, JSON.stringify(trimmed));
      } catch (e) {
        console.warn('Error al guardar pedido en historial local:', e);
      }
    }
  }

  getCustomerProfile(): CustomerProfile | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    try {
      const saved = localStorage.getItem(this.PROFILE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  saveCustomerProfile(profile: CustomerProfile) {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.PROFILE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.warn('Error al guardar datos del cliente:', e);
    }
  }

  /**
   * Genera el mensaje estructurado de comanda para enviar por WhatsApp al negocio (951 222 4034),
   * con el formato completo idéntico al sistema de solicitudes y tickets.
   */
  getWhatsAppShareUrl(order: ClientSubmittedOrder, businessPhone: string = '5219512224034'): string {
    const lines: string[] = [
      `🍽️ *NÓRDIKOS GRILL HOUSE* 🍽️`,
      `📋 *Solicitud de Pedido:* #${order.request_code}`,
      `🏷️ *Servicio:* ${order.service_name}${order.cliente.numero_mesa ? ' (Mesa ' + order.cliente.numero_mesa + ')' : ''}`,
    ];

    try {
      const fecha = new Date(order.created_at);
      lines.push(`📅 *Fecha:* ${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch {}

    lines.push(`----------------------------------------`);

    if (order.cliente.nombre) {
      lines.push(`👤 *Cliente:* ${order.cliente.nombre}`);
    }
    if (order.cliente.telefono) {
      lines.push(`📞 *Teléfono:* ${order.cliente.telefono}`);
    }

    if (order.service_code === 'delivery') {
      if (order.cliente.direccion) {
        lines.push(`📍 *Dirección:* ${order.cliente.direccion}`);
      }
      if (order.cliente.referencias) {
        lines.push(`📝 *Referencias:* ${order.cliente.referencias}`);
      }
      const mapsUrl = getGoogleMapsUrl(order.location, order.cliente.direccion);
      if (mapsUrl) {
        lines.push(`🗺️ *Ubicación GPS:* ${mapsUrl}`);
      }
    }

    lines.push(`----------------------------------------`);
    lines.push(`🛒 *DETALLE DEL PEDIDO:*`);

    order.items.forEach(item => {
      const variantStr = item.variante ? ` (${item.variante.nombre})` : '';
      const subtotal = (item.precio * item.cantidad).toFixed(2);
      lines.push(`• ${item.cantidad}x ${item.nombre}${variantStr} - $${subtotal}`);
      if (item.nota?.trim()) {
        lines.push(`   ↳ _Nota: "${item.nota.trim()}"_`);
      }
    });

    lines.push(`----------------------------------------`);

    if (order.nota_general?.trim()) {
      lines.push(`💬 *Nota General:* ${order.nota_general.trim()}`);
      lines.push(`----------------------------------------`);
    }

    lines.push(`💰 *TOTAL:* $${order.total.toFixed(2)}`);
    lines.push(``);
    lines.push(`_¡Hola! Les comparto mi comanda enviada desde el Menú Digital para su confirmación y seguimiento._`);

    const message = lines.join('\n');
    return `https://wa.me/${businessPhone}?text=${encodeURIComponent(message)}`;
  }
}
