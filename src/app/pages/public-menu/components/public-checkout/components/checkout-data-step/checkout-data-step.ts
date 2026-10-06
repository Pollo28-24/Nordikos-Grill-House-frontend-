import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ServiceCode } from '../../public-checkout';
import { OrderRequestLocation } from '@core/models/order.model';

@Component({
  selector: 'app-checkout-data-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  template: `
    <form [formGroup]="form()" class="space-y-4">
      
      <!-- SUB-SECCIÓN: COMEDOR / MESA -->
      @if (serviceCode() === 'mesa') {
        <div class="bg-orange-50/60 border border-orange-200/80 p-3.5 rounded-2xl space-y-2 animate-in fade-in duration-200">
          <label class="block text-xs font-bold text-gray-800">
            Número de Mesa <span class="text-orange-600">*</span>
          </label>
          <div class="relative">
            <lucide-icon name="utensils" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"></lucide-icon>
            <input 
              type="text" 
              formControlName="numero_mesa" 
              placeholder="Ej: Mesa 4 o Barra 2" 
              class="w-full pl-11 pr-4 py-2.5 bg-white rounded-xl border text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none"
              [class.border-red-400]="form().get('numero_mesa')?.invalid && form().get('numero_mesa')?.touched"
              [class.border-[#E2D7B7]]="!form().get('numero_mesa')?.invalid || !form().get('numero_mesa')?.touched"
            />
          </div>
          @if (form().get('numero_mesa')?.invalid && form().get('numero_mesa')?.touched) {
            <p class="text-[11px] text-red-600 font-medium flex items-center gap-1.5 animate-in fade-in">
              <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
              <span>Por favor indica tu número de mesa.</span>
            </p>
          }
          <p class="text-[11px] text-gray-500">Indícanos en qué mesa estás sentado para llevártelo directamente.</p>
        </div>
      }

      <!-- SUB-SECCIÓN: SERVICIO A DOMICILIO (GPS & DIRECCIÓN) -->
      @if (serviceCode() === 'delivery') {
        <div class="space-y-3 bg-white p-4 rounded-2xl border border-[#E2D7B7] shadow-xs animate-in fade-in duration-200">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <lucide-icon name="map-pin" class="w-4 h-4 text-orange-500"></lucide-icon>
              <span>Ubicación de Entrega <span class="text-orange-600">*</span></span>
            </span>
            @if (geoStatus() === 'success') {
              <span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ Ubicación precisa capturada
              </span>
            }
          </div>

          <!-- Botón de Captura GPS -->
          <button 
            type="button" 
            (click)="requestLocation.emit()" 
            [disabled]="geoStatus() === 'requesting'"
            class="w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer touch-manipulation"
            [ngClass]="{
              'bg-orange-500 hover:bg-orange-600 text-white shadow-sm': geoStatus() !== 'success',
              'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300': geoStatus() === 'success'
            }"
          >
            @if (geoStatus() === 'requesting') {
              <lucide-icon name="loader" class="h-4 w-4 animate-spin"></lucide-icon>
              <span>Obteniendo coordenadas GPS...</span>
            } @else if (geoStatus() === 'success') {
              <lucide-icon name="check" class="h-4 w-4 text-emerald-600"></lucide-icon>
              <span>Actualizar mi ubicación actual</span>
            } @else {
              <lucide-icon name="navigation" class="h-4 w-4"></lucide-icon>
              <span>Usar mi ubicación actual (GPS automático)</span>
            }
          </button>

          <!-- Feedback de Ubicación Capturada -->
          @if (capturedLocation(); as loc) {
            <div class="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs space-y-1">
              <div class="flex items-center justify-between text-emerald-800 font-semibold text-[11px]">
                <span>Coordenadas: {{ loc.latitude.toFixed(5) }}, {{ loc.longitude.toFixed(5) }}</span>
                @if (loc.accuracy) {
                  <span class="text-[10px] text-gray-500">(±{{ loc.accuracy.toFixed(0) }}m)</span>
                }
              </div>
              <button 
                type="button" 
                (click)="openGoogleMaps.emit()"
                class="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:underline pt-0.5"
              >
                <lucide-icon name="external-link" class="w-3 h-3"></lucide-icon>
                <span>Ver en Google Maps</span>
              </button>
            </div>
          }

          <!-- Modo Manual o Campos de Dirección -->
          <div class="space-y-2 pt-1 border-t border-gray-100">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-gray-700">
                Dirección Escrita / Referencias <span class="text-orange-600">*</span>
              </label>
              @if (!manualAddressMode() && geoStatus() !== 'success') {
                <button 
                  type="button" 
                  (click)="enableManualAddress.emit()" 
                  class="text-[11px] font-semibold text-orange-600 hover:underline"
                >
                  Prefiero escribir mi dirección
                </button>
              }
            </div>

            <div class="relative">
              <lucide-icon name="map-pin" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"></lucide-icon>
              <input 
                type="text" 
                formControlName="direccion" 
                placeholder="Calle, número exterior/interior, colonia..." 
                class="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none"
                [class.border-red-400]="form().get('direccion')?.invalid && form().get('direccion')?.touched"
                [class.border-[#E2D7B7]]="!form().get('direccion')?.invalid || !form().get('direccion')?.touched"
              />
            </div>
            @if (form().get('direccion')?.invalid && form().get('direccion')?.touched) {
              <p class="text-[11px] text-red-600 font-medium flex items-center gap-1.5 animate-in fade-in">
                <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span>Por favor ingresa tu dirección de entrega o usa tu GPS actual.</span>
              </p>
            }

            <div class="relative">
              <lucide-icon name="info" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"></lucide-icon>
              <input 
                type="text" 
                formControlName="referencias" 
                placeholder="Referencias (Ej: portón blanco, junto a la tienda...)" 
                class="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none border-[#E2D7B7]"
              />
            </div>
          </div>
        </div>
      }

      <!-- SUB-SECCIÓN: DATOS DE CONTACTO GENERALES -->
      <div class="space-y-3 pt-1">
        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Datos de Contacto
        </h4>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <!-- Nombre -->
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-gray-700">
              Nombre Completo <span class="text-orange-600">*</span>
            </label>
            <div class="relative">
              <lucide-icon name="user" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"></lucide-icon>
              <input 
                type="text" 
                formControlName="nombre" 
                placeholder="Tu nombre completo" 
                class="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none"
                [class.border-red-400]="form().get('nombre')?.invalid && form().get('nombre')?.touched"
                [class.border-[#E2D7B7]]="!form().get('nombre')?.invalid || !form().get('nombre')?.touched"
              />
            </div>
            @if (form().get('nombre')?.invalid && form().get('nombre')?.touched) {
              <p class="text-[11px] text-red-600 font-medium flex items-center gap-1.5 animate-in fade-in">
                <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span>Por favor ingresa tu nombre completo.</span>
              </p>
            }
          </div>

          <!-- Teléfono / WhatsApp -->
          <div class="space-y-1">
            <label class="block text-[11px] font-bold text-gray-700">
              Teléfono (WhatsApp) <span class="text-orange-600">*</span>
            </label>
            <div class="relative">
              <lucide-icon name="phone" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"></lucide-icon>
              <input 
                type="tel" 
                formControlName="telefono" 
                placeholder="10 dígitos (Ej: 951 123 4567)" 
                class="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none"
                [class.border-red-400]="form().get('telefono')?.invalid && form().get('telefono')?.touched"
                [class.border-[#E2D7B7]]="!form().get('telefono')?.invalid || !form().get('telefono')?.touched"
              />
            </div>
            @if (form().get('telefono')?.invalid && form().get('telefono')?.touched) {
              <p class="text-[11px] text-red-600 font-medium flex items-center gap-1.5 animate-in fade-in">
                <lucide-icon name="alert-circle" class="w-3.5 h-3.5 shrink-0"></lucide-icon>
                <span>Ingresa un número de WhatsApp válido (10 dígitos).</span>
              </p>
            }
          </div>
        </div>

        <!-- Correo Electrónico (Opcional) -->
        <div class="space-y-1">
          <label class="block text-[11px] font-semibold text-gray-500 flex items-center justify-between">
            <span>Correo Electrónico</span>
            <span class="text-[10px] text-gray-400">Opcional</span>
          </label>
          <div class="relative">
            <lucide-icon name="mail" class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"></lucide-icon>
            <input 
              type="email" 
              formControlName="email" 
              placeholder="Para enviarte copia del recibo" 
              class="w-full pl-11 pr-3.5 py-2.5 bg-white rounded-xl border text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none border-[#E2D7B7]"
            />
          </div>
        </div>

        <!-- Nota General del Pedido -->
        <div class="space-y-1">
          <label class="block text-[11px] font-semibold text-gray-500 flex items-center justify-between">
            <span>Comentarios Adicionales</span>
            <span class="text-[10px] text-gray-400">Opcional</span>
          </label>
          <textarea 
            formControlName="nota_general" 
            placeholder="Ej: traer cambio de $500, tocar el timbre fuerte..." 
            rows="2"
            class="w-full p-2.5 bg-white rounded-xl border border-[#E2D7B7] text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition outline-none resize-none"
          ></textarea>
        </div>
      </div>

    </form>
  `
})
export class CheckoutDataStepComponent {
  form = input.required<FormGroup>();
  serviceCode = input.required<ServiceCode>();
  geoStatus = input.required<'idle' | 'requesting' | 'success' | 'denied' | 'error'>();
  capturedLocation = input<OrderRequestLocation | null>(null);
  manualAddressMode = input<boolean>(false);

  requestLocation = output<void>();
  enableManualAddress = output<void>();
  openGoogleMaps = output<void>();
}
