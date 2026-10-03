import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { ServiceCode } from '../../public-checkout';
import { ClientSubmittedOrder, OrderRequestLocation } from '@core/models/order.model';
import { getGoogleMapsUrl } from '@core/utils/order-location.utils';

@Component({
  selector: 'app-checkout-success-step',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CurrencyMxnPipe],
  template: `
    <div class="py-2 space-y-4 animate-in zoom-in-95 duration-200">
      
      <!-- Encabezado de Éxito -->
      <div class="text-center space-y-1">
        <div class="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
          <lucide-icon name="check-circle2" class="h-7 w-7"></lucide-icon>
        </div>
        <h3 class="text-lg sm:text-xl font-extrabold text-gray-900">¡Pedido Enviado con Éxito!</h3>
        <p class="text-xs text-gray-600 max-w-xs mx-auto leading-relaxed">
          Tu comanda ha sido recibida en cocina. Puedes compartirla por WhatsApp para confirmación y seguimiento en tiempo real.
        </p>
      </div>

      <!-- Card Principal: Resumen del Pedido -->
      <div class="bg-white border border-[#E2D7B7] rounded-2xl p-4 shadow-sm space-y-3.5 text-left">
        
        <!-- Header con Código y Tipo de Servicio -->
        <div class="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <span class="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Código de Solicitud</span>
            <span class="text-2xl font-black text-orange-600 font-mono tracking-wider">
              #{{ requestCode() }}
            </span>
          </div>
          
          <div class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
            [ngClass]="{
              'bg-orange-50 text-orange-700 border-orange-200': serviceCode() === 'mesa',
              'bg-blue-50 text-blue-700 border-blue-200': serviceCode() === 'llevar',
              'bg-emerald-50 text-emerald-700 border-emerald-200': serviceCode() === 'delivery'
            }">
            @if (serviceCode() === 'mesa') {
              <lucide-icon name="utensils" class="w-3.5 h-3.5"></lucide-icon>
              <span>Comedor</span>
            } @else if (serviceCode() === 'delivery') {
              <lucide-icon name="bike" class="w-3.5 h-3.5"></lucide-icon>
              <span>A Domicilio</span>
            } @else {
              <lucide-icon name="shopping-bag" class="w-3.5 h-3.5"></lucide-icon>
              <span>Para Llevar</span>
            }
          </div>
        </div>

        <!-- Datos del Cliente, Pago y Entrega -->
        @if (order(); as ord) {
          <div class="text-xs space-y-1.5 text-gray-600 bg-[#F8F5EE]/60 p-3 rounded-xl border border-[#E2D7B7]/40">
            <p><span class="font-bold text-gray-800">👤 Cliente:</span> {{ ord.cliente.nombre }} ({{ ord.cliente.telefono }})</p>
            @if (ord.metodo_pago) {
              <div class="flex items-center gap-1.5 pt-0.5">
                <span class="font-bold text-gray-800">💳 Método de Pago:</span>
                <span class="px-2 py-0.5 rounded-md bg-white border border-[#E2D7B7] text-zinc-900 font-bold text-[11px]">
                  {{ getPaymentMethodLabel(ord.metodo_pago) }}
                </span>
              </div>
            }
            @if (ord.service_code === 'delivery' && ord.cliente.direccion) {
              <p><span class="font-bold text-gray-800">📍 Dirección:</span> {{ ord.cliente.direccion }}</p>
              @if (ord.cliente.referencias) {
                <p><span class="font-bold text-gray-800">📝 Ref:</span> {{ ord.cliente.referencias }}</p>
              }
              @if (getMapsUrl(ord.location, ord.cliente.direccion); as mapsUrl) {
                <a [href]="mapsUrl" target="_blank" class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-0.5">
                  <lucide-icon name="map-pin" class="w-3 h-3 text-blue-600"></lucide-icon>
                  <span>Ver ubicación en Google Maps</span>
                </a>
              }
            }
          </div>

          <!-- Lista Detallada de Items -->
          <div>
            <h4 class="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center justify-between">
              <span>Productos Solicitados ({{ ord.items.length }})</span>
            </h4>
            <div class="divide-y divide-gray-100 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              @for (item of ord.items; track item.id) {
                <div class="py-2 flex items-start justify-between gap-2 text-xs">
                  <div class="grow">
                    <p class="font-bold text-gray-900">
                      {{ item.cantidad }}x {{ item.nombre }}
                      @if (item.variante) {
                        <span class="text-orange-600 font-semibold">({{ item.variante.nombre }})</span>
                      }
                    </p>
                    @if (item.modificadores && item.modificadores.length > 0) {
                      <div class="flex flex-wrap gap-1 mt-1">
                        @for (m of item.modificadores; track m.nombre_modificador) {
                          <span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.2 rounded">
                            + {{ m.nombre_modificador }}@if (m.cantidad > 1) { x{{ m.cantidad }} }
                          </span>
                        }
                      </div>
                    }
                    @if (item.nota) {
                      <p class="text-[10px] text-amber-700 italic mt-0.5">
                        ↳ Nota: "{{ item.nota }}"
                      </p>
                    }
                  </div>
                  <span class="font-black text-gray-800 shrink-0">
                    {{ (item.precio * item.cantidad) | currencyMxn }}
                  </span>
                </div>
              }
            </div>
          </div>

          @if (ord.nota_general) {
            <div class="p-2.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs text-amber-900">
              <span class="font-bold">💬 Nota General:</span> "{{ ord.nota_general }}"
            </div>
          }
        }

        <!-- Total Final -->
        <div class="pt-2 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs font-bold text-gray-600">Total a Pagar:</span>
          <span class="text-lg font-black text-gray-900">
            {{ total() | currencyMxn }}
          </span>
        </div>
      </div>

      <!-- Botones de Acción -->
      <div class="space-y-2 max-w-sm mx-auto">
        <a 
          [href]="whatsappUrl()" 
          target="_blank"
          class="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-98 transition touch-manipulation cursor-pointer"
        >
          <lucide-icon name="share-2" class="h-4 w-4 shrink-0"></lucide-icon>
          <span>Enviar comanda al WhatsApp del negocio</span>
        </a>

        <!-- Ver historial de órdenes si tiene pedidos previos -->
        @if (ordersCount() > 1) {
          <button 
            type="button" 
            (click)="viewHistory.emit()"
            class="w-full h-11 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 text-xs font-bold flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            <lucide-icon name="receipt" class="h-4 w-4 text-orange-600"></lucide-icon>
            <span>Ver todos mis pedidos realizados ({{ ordersCount() }})</span>
          </button>
        }

        <!-- Hacer otro pedido / Volver al menú -->
        <div class="grid grid-cols-2 gap-2 pt-1">
          <button 
            type="button" 
            (click)="newOrder.emit()"
            class="h-11 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition cursor-pointer"
          >
            <lucide-icon name="plus-circle" class="h-4 w-4"></lucide-icon>
            <span>Hacer otro pedido</span>
          </button>

          <button 
            type="button" 
            (click)="close.emit()"
            class="h-11 rounded-xl bg-zinc-200/80 hover:bg-zinc-300 text-gray-800 text-xs font-bold active:scale-98 transition cursor-pointer"
          >
            Volver al Menú
          </button>
        </div>
      </div>

    </div>
  `
})
export class CheckoutSuccessStepComponent {
  requestCode = input.required<string>();
  serviceCode = input.required<ServiceCode>();
  order = input<ClientSubmittedOrder | null>(null);
  total = input.required<number>();
  whatsappUrl = input.required<string>();
  ordersCount = input<number>(0);

  viewHistory = output<void>();
  newOrder = output<void>();
  close = output<void>();

  getMapsUrl(location?: OrderRequestLocation | null, address?: string | null): string | null {
    return getGoogleMapsUrl(location, address);
  }

  getPaymentMethodLabel(method?: string | null): string {
    if (!method) return 'Efectivo';
    const p = method.toLowerCase();
    if (p.includes('efectivo') || p === 'cash') return 'Efectivo (Pago al recibir)';
    if (p.includes('tarjeta') || p.includes('terminal') || p === 'card') return 'Tarjeta (Terminal física)';
    if (p.includes('transferencia') || p.includes('spei') || p === 'transfer') return 'Transferencia SPEI';
    return method;
  }
}
