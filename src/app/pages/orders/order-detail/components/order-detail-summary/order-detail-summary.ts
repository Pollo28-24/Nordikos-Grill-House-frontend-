import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { OrderRequestLocation } from '@core/models/order.model';
import { parseLocationMetadata, getGoogleMapsUrl, getDeliveryWhatsAppShareUrl } from '@core/utils/order-location.utils';
import { OrderPolicy } from '@core/domain/order/order.policy';
import { ServiceTypeCode } from '@core/domain/order/order.types';
import { validateServiceTypePrerequisites } from '@core/domain/order/order.state-machine';

export interface ServiceTypeChangeEvent {
  serviceTypeId: number;
  serviceCode: ServiceTypeCode;
  serviceName: string;
  numeroMesa?: string | null;
  direccionEntrega?: string | null;
}

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
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Detalles del Servicio</h3>
            @if (canChangeService() && !isEditingService()) {
              <button
                (click)="startEditingService()"
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition cursor-pointer select-none"
                title="Cambiar tipo de servicio (Mesa / Llevar / Domicilio)"
              >
                <lucide-icon name="edit-3" class="w-3.5 h-3.5 text-[#FFB300]" />
                <span>Cambiar</span>
              </button>
            }
          </div>
          
          <!-- Vista Normal de Métricas de Servicio -->
          @if (!isEditingService()) {
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <!-- Métrica 1: Servicio -->
              <div class="flex flex-col">
                <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Servicio</span>
                <span class="text-xs font-extrabold text-white truncate inline-flex items-center gap-1.5 flex-wrap">
                  <span class="px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/10 text-xs font-bold">
                    {{ order()?.tipos_servicio?.nombre || order()?.tipo_servicio_nombre || 'N/A' }}
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
                    {{ order()?.metodos_pago?.nombre || order()?.metodo_pago_nombre || 'N/A' }}
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
          } @else {
            <!-- Selector Interactivo de Cambio de Servicio -->
            <div class="p-3.5 rounded-xl bg-white/[0.02] border border-amber-500/20 space-y-3 animate-in fade-in duration-200">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase text-amber-400 tracking-wider">Seleccionar Nuevo Servicio:</span>
                <button (click)="isEditingService.set(false)" class="text-zinc-400 hover:text-white text-xs font-bold cursor-pointer">
                  Cancelar
                </button>
              </div>

              <!-- Chips de selección rápida -->
              <div class="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  (click)="selectedServiceCode.set('comedor')"
                  class="h-10 rounded-xl text-xs font-bold border transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="{
                    'bg-amber-500/20 border-amber-500/40 text-[#FFB300]': selectedServiceCode() === 'comedor',
                    'bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]': selectedServiceCode() !== 'comedor'
                  }"
                >
                  <lucide-icon name="utensils" class="w-3.5 h-3.5" />
                  <span>Comedor</span>
                </button>

                <button
                  type="button"
                  (click)="selectedServiceCode.set('llevar')"
                  class="h-10 rounded-xl text-xs font-bold border transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="{
                    'bg-amber-500/20 border-amber-500/40 text-[#FFB300]': selectedServiceCode() === 'llevar',
                    'bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]': selectedServiceCode() !== 'llevar'
                  }"
                >
                  <lucide-icon name="shopping-bag" class="w-3.5 h-3.5" />
                  <span>Para Llevar</span>
                </button>

                <button
                  type="button"
                  (click)="selectedServiceCode.set('domicilio')"
                  class="h-10 rounded-xl text-xs font-bold border transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer"
                  [ngClass]="{
                    'bg-amber-500/20 border-amber-500/40 text-[#FFB300]': selectedServiceCode() === 'domicilio',
                    'bg-white/[0.04] border-white/10 text-zinc-300 hover:bg-white/[0.08]': selectedServiceCode() !== 'domicilio'
                  }"
                >
                  <lucide-icon name="bike" class="w-3.5 h-3.5" />
                  <span>Domicilio</span>
                </button>
              </div>

              <!-- Inputs específicos según servicio -->
              @if (selectedServiceCode() === 'comedor') {
                <div class="flex items-center gap-2">
                  <span class="text-xs text-zinc-400 font-bold shrink-0">Número de Mesa:</span>
                  <input
                    type="text"
                    [value]="tableInput()"
                    (input)="tableInput.set($any($event.target).value)"
                    placeholder="Ej. 4, 12, Terraza..."
                    class="h-9 px-3 rounded-lg bg-black/60 border border-white/15 text-white text-xs font-bold focus:border-[#FFB300] focus:outline-none w-full"
                  />
                </div>
              }

              @if (selectedServiceCode() === 'domicilio') {
                <div class="flex items-center gap-2">
                  <span class="text-xs text-zinc-400 font-bold shrink-0">Dirección:</span>
                  <input
                    type="text"
                    [value]="addressInput()"
                    (input)="addressInput.set($any($event.target).value)"
                    placeholder="Calle, número, colonia..."
                    class="h-9 px-3 rounded-lg bg-black/60 border border-white/15 text-white text-xs font-bold focus:border-[#FFB300] focus:outline-none w-full"
                  />
                </div>
              }

              @if (validationError()) {
                <p class="text-xs text-red-400 font-medium">{{ validationError() }}</p>
              }

              <!-- Botón Confirmar Cambio -->
              <div class="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  (click)="saveServiceTypeChange()"
                  class="h-9 px-4 rounded-xl bg-[#FFB300] text-black font-extrabold text-xs uppercase tracking-wider hover:bg-[#FFB300]/90 active:scale-95 transition cursor-pointer select-none"
                >
                  Guardar Servicio
                </button>
              </div>
            </div>
          }
        </div>

      </div>

      <!-- Sección de Entrega a Domicilio y Geolocalización GPS -->
      @if (deliveryAddress || location || isDeliveryService) {
        <div class="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <lucide-icon name="map-pin" class="w-4.5 h-4.5 text-orange-400" />
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Dirección de Entrega</span>
              <span class="text-xs sm:text-sm font-bold text-zinc-100 mt-0.5">{{ deliveryAddress || (location ? 'Ubicación GPS registrada' : 'Sin dirección registrada') }}</span>
              @if (deliveryReferences) {
                <span class="text-xs text-amber-300 font-medium mt-1 inline-flex items-center gap-1.5">
                  <span class="font-bold text-amber-400/90">📝 Ref:</span> {{ deliveryReferences }}
                </span>
              }
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

  changeServiceType = output<ServiceTypeChangeEvent>();

  isEditingService = signal(false);
  selectedServiceCode = signal<ServiceTypeCode>('comedor');
  tableInput = signal('');
  addressInput = signal('');
  validationError = signal<string | null>(null);

  canChangeService(): boolean {
    const o = this.order();
    if (!o) return false;
    return OrderPolicy.canChangeServiceType(o);
  }

  startEditingService() {
    const o = this.order();
    const rawCode = (o?.tipos_servicio?.nombre || o?.tipo_servicio_codigo || '').toLowerCase();
    let currentCode: ServiceTypeCode = 'comedor';
    if (rawCode.includes('llevar') || rawCode.includes('take')) currentCode = 'llevar';
    else if (rawCode.includes('domicilio') || rawCode.includes('delivery')) currentCode = 'domicilio';

    this.selectedServiceCode.set(currentCode);
    this.tableInput.set(o?.numero_mesa || '');
    this.addressInput.set(this.deliveryAddress || '');
    this.validationError.set(null);
    this.isEditingService.set(true);
  }

  saveServiceTypeChange() {
    const targetCode = this.selectedServiceCode();
    const mesa = targetCode === 'comedor' ? this.tableInput().trim() : null;
    const direccion = targetCode === 'domicilio' ? this.addressInput().trim() : null;

    const validation = validateServiceTypePrerequisites(targetCode, mesa, direccion);
    if (!validation.valid) {
      this.validationError.set(validation.error || 'Datos incompletos');
      return;
    }

    let typeId = 1;
    let name = 'Comedor';
    if (targetCode === 'llevar') {
      typeId = 2;
      name = 'Para Llevar';
    } else if (targetCode === 'domicilio') {
      typeId = 3;
      name = 'Domicilio';
    }

    this.changeServiceType.emit({
      serviceTypeId: typeId,
      serviceCode: targetCode,
      serviceName: name,
      numeroMesa: mesa,
      direccionEntrega: direccion,
    });

    this.isEditingService.set(false);
  }

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
    const o = this.order();
    if (o?.latitude !== null && o?.latitude !== undefined && o?.longitude !== null && o?.longitude !== undefined) {
      return {
        latitude: Number(o.latitude),
        longitude: Number(o.longitude),
        accuracy: o.accuracy ? Number(o.accuracy) : undefined
      };
    }
    return this.parsedNote.location;
  }

  get isDeliveryService(): boolean {
    const o = this.order();
    const rawCode = (o?.tipos_servicio?.nombre || o?.tipo_servicio_codigo || o?.tipo_servicio_nombre || '').toLowerCase();
    return rawCode.includes('domicilio') || rawCode.includes('delivery');
  }

  get rawAddress(): string | null {
    const o = this.order();
    return o?.direccion_entrega || o?.clientes?.direccion || null;
  }

  get deliveryReferences(): string | null {
    const o = this.order();
    if (o?.referencias) return o.referencias;
    const raw = this.rawAddress;
    if (raw && raw.includes('(Ref:')) {
      const match = raw.match(/\(Ref:\s*([^)]+)\)/i);
      return match ? match[1].trim() : null;
    }
    return null;
  }

  get deliveryAddress(): string | null {
    const raw = this.rawAddress;
    if (!raw) return null;
    if (raw.includes('(Ref:')) {
      return raw.replace(/\s*\(Ref:\s*[^)]+\)/i, '').trim();
    }
    return raw;
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
      references: this.deliveryReferences,
      location: this.location,
      note: this.cleanNote,
      total: o?.total,
    });
  }
}
