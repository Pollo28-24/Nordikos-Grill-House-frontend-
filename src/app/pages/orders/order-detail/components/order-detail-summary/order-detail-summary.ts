import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { OrderRequestLocation } from '@core/models/order.model';
import { parseLocationMetadata, getGoogleMapsUrl, getDeliveryWhatsAppShareUrl } from '@core/utils/order-location.utils';

@Component({
  selector: 'app-order-detail-summary',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-4 sm:p-5 rounded-2xl bg-[#1A1A1A] border border-white/10 shadow-sm mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        <!-- Sección Cliente (4 columnas en md) -->
        <div class="md:col-span-4 flex flex-col">
          <h3 class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Cliente</h3>
          <div class="space-y-2">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                <lucide-icon name="user" class="w-4 h-4 text-[#FFB300]" />
              </div>
              <span class="text-sm sm:text-base font-extrabold text-white truncate">{{ order()?.clientes?.nombre || 'Consumidor Final' }}</span>
            </div>
            
            @if (order()?.clientes?.telefono) {
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                  <lucide-icon name="phone" class="w-4 h-4 text-zinc-400" />
                </div>
                <span class="text-zinc-300 text-xs sm:text-sm font-semibold">{{ order()?.clientes.telefono }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Divisor vertical opcional para md+ -->
        <div class="hidden md:block md:col-span-1 self-stretch border-r border-white/10 my-1"></div>

        <!-- Detalles del Servicio en 2 Columnas / Métricas (7 columnas en md) -->
        <div class="md:col-span-7">
          <h3 class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Detalles del Servicio</h3>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <!-- Métrica 1: Servicio -->
            <div class="flex flex-col">
              <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Servicio</span>
              <span class="text-xs font-extrabold text-white truncate inline-flex items-center gap-1.5 flex-wrap">
                <span class="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-bold">
                  {{ order()?.tipos_servicio?.nombre }}
                </span>
                @if (order()?.numero_mesa) {
                  <span class="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[#FFB300] text-xs font-bold">
                    Mesa {{ order().numero_mesa }}
                  </span>
                }
              </span>
            </div>

            <!-- Métrica 2: Pago -->
            <div class="flex flex-col">
              <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Pago</span>
              <span class="text-xs font-extrabold text-white truncate inline-flex items-center">
                <span class="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-bold">
                  {{ order()?.metodos_pago?.nombre }}
                </span>
              </span>
            </div>

            <!-- Métrica 3: Fecha -->
            <div class="flex flex-col">
              <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Fecha Creación</span>
              <span class="text-xs sm:text-sm font-black text-zinc-200 leading-tight">
                {{ order()?.fecha_creacion | date:'dd/MM/yy' }}
                <span class="block text-[10px] sm:text-xs font-medium text-zinc-400 mt-0.5">{{ order()?.fecha_creacion | date:'hh:mm a' }}</span>
              </span>
            </div>

            <!-- Métrica 4: Tiempo -->
            <div class="flex flex-col">
              <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                {{ order()?.fecha_cierre ? 'Duración total' : 'Tiempo en curso' }}
              </span>
              <span class="text-xs sm:text-sm font-black tracking-tight inline-flex items-center" [class.text-[#FFB300]]="!order()?.fecha_cierre" [class.text-white]="order()?.fecha_cierre">
                @if (!order()?.fecha_cierre) {
                  <span class="inline-block w-2 h-2 rounded-full bg-[#FFB300] animate-pulse mr-1.5 shrink-0 shadow-[0_0_8px_rgba(255,179,0,0.5)]"></span>
                }
                {{ duration }}
              </span>
            </div>
          </div>
        </div>

      </div>

      <!-- Sección de Entrega a Domicilio y Geolocalización GPS -->
      @if (deliveryAddress || location) {
        <div class="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <lucide-icon name="map-pin" class="w-4.5 h-4.5 text-orange-400" />
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Dirección de Entrega</span>
              <span class="text-xs sm:text-sm font-bold text-zinc-100 mt-0.5">{{ deliveryAddress || 'Ubicación GPS registrada' }}</span>
              @if (location; as loc) {
                <span class="text-xs text-emerald-400 font-mono mt-1">
                  📍 GPS: {{ loc.latitude | number:'1.4-4' }}, {{ loc.longitude | number:'1.4-4' }}
                </span>
              }
            </div>
          </div>

          <!-- Acciones Google Maps y WhatsApp Repartidor (40px touch targets) -->
          <div class="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            @if (mapsUrl) {
              <a 
                [href]="mapsUrl" 
                target="_blank" 
                rel="noopener noreferrer"
                class="h-10 px-3.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-400 border border-blue-500/20 text-xs font-bold inline-flex items-center gap-2 transition active:scale-95 cursor-pointer select-none"
                title="Abrir ubicación en Google Maps"
              >
                <lucide-icon name="map-pin" class="w-4 h-4 text-blue-400" />
                <span>Ver en Maps</span>
              </a>
            }

            <a 
              [href]="deliveryWhatsAppUrl" 
              target="_blank" 
              rel="noopener noreferrer"
              class="h-10 px-3.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 text-xs font-bold inline-flex items-center gap-2 transition active:scale-95 cursor-pointer select-none"
              title="Compartir entrega por WhatsApp con repartidor"
            >
              <lucide-icon name="share-2" class="w-4 h-4 text-emerald-400" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      }

      <!-- Nota General Limpia -->
      @if (cleanNote) {
        <div class="mt-4 bg-orange-500/5 border border-orange-500/15 rounded-xl p-3.5 flex items-start gap-2.5">
          <span class="text-[10px] sm:text-xs font-bold text-orange-400 uppercase tracking-wider shrink-0 mt-0.5">Nota General:</span>
          <span class="text-xs sm:text-sm text-orange-200/90 font-medium italic leading-relaxed">"{{ cleanNote }}"</span>
        </div>
      }
    </div>
  `,
})
export class OrderDetailSummary {
  order = input.required<any>();
  currentTime = input.required<number>();

  get duration(): string {
    const o = this.order();
    if (!o?.fecha_creacion) return '...';
    
    const start = new Date(o.fecha_creacion).getTime();
    const end = o.fecha_cierre ? new Date(o.fecha_cierre).getTime() : this.currentTime();
    
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      return `${diffMins}m ${diffSecs}s`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${diffHours}h ${remainingMins}m`;
    }
  }

  // Location and Note helpers
  get parsedNote() {
    return parseLocationMetadata(this.order()?.nota_general);
  }

  get cleanNote(): string | null {
    return this.parsedNote.cleanNote;
  }

  get location(): OrderRequestLocation | null {
    return this.parsedNote.location;
  }

  get deliveryAddress(): string | null {
    const o = this.order();
    return o?.direccion_entrega || o?.clientes?.direccion || null;
  }

  get mapsUrl(): string | null {
    return getGoogleMapsUrl(this.location, this.deliveryAddress);
  }

  get deliveryWhatsAppUrl(): string {
    const o = this.order();
    return getDeliveryWhatsAppShareUrl({
      orderCode: o?.numero_orden || o?.id || '',
      clientName: o?.clientes?.nombre,
      phone: o?.clientes?.telefono,
      address: this.deliveryAddress,
      location: this.location,
      note: this.cleanNote,
      total: o?.total,
    });
  }
}

