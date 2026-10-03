import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { CustomizationStore } from '../../store/customization.store';

@Component({
  selector: 'app-modal-hero-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CurrencyMxnPipe],
  template: `
    @if (store.product(); as p) {
      <!-- 1. Imagen de Cabecera con Botón de Cierre Ergonómico y Compacto -->
      <div class="relative h-24 sm:h-32 bg-zinc-900 shrink-0 overflow-hidden">
        @if (p.imagen_url) {
          <img [src]="p.imagen_url" [alt]="p.nombre" class="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-110">
          <img [src]="p.imagen_url" [alt]="p.nombre" class="relative w-full h-full object-contain p-1.5 drop-shadow-xl">
        } @else {
          <div class="w-full h-full flex items-center justify-center text-gray-400">
            <lucide-icon name="image" class="h-8 w-8"></lucide-icon>
          </div>
        }

        <!-- Botón de Cierre Táctil -->
        <button 
          type="button"
          (click)="onClose.emit()" 
          class="absolute top-2 right-2 w-9 h-9 sm:w-10 sm:h-10 bg-black/60 hover:bg-black/80 active:scale-90 text-white rounded-full backdrop-blur-md transition flex items-center justify-center z-20 cursor-pointer touch-manipulation shadow-md"
          title="Cerrar modal"
          aria-label="Cerrar modal"
        >
          <lucide-icon name="x" class="h-4 w-4 sm:h-5 sm:w-5"></lucide-icon>
        </button>
      </div>

      <!-- 2. Título, Resumen de Precio y Descripción Completa -->
      <div class="px-4 sm:px-5 py-2 sm:py-2.5 bg-[#F8F5EE] border-b border-[#E2D7B7]/40">
        <!-- Fila 1: Nombre del Producto + Precio Base + Badge Personalizable -->
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm sm:text-base font-black text-gray-900 leading-tight">
            {{ p.nombre }}
          </h3>

          <div class="flex items-center gap-2 shrink-0">
            <!-- Precio base para producto simple -->
            @if (!(p.variants && p.variants.length > 0)) {
              <div class="flex items-baseline gap-1">
                @if (p.descuento && p.descuento > 0) {
                  <span class="text-xs sm:text-sm font-black text-orange-600 tabular-nums">
                    {{ (p.precio! - p.descuento!) | currencyMxn }}
                  </span>
                  <del class="text-[10px] text-gray-400 font-medium">
                    {{ p.precio! | currencyMxn }}
                  </del>
                } @else {
                  <span class="text-xs sm:text-sm font-black text-orange-600 tabular-nums">
                    {{ p.precio! | currencyMxn }}
                  </span>
                }
              </div>
            }

            @if ((p.variants && p.variants.length > 0) || (p.modifiers && p.modifiers.length > 0)) {
              <span class="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[9px] font-black uppercase tracking-wide">
                Personalizable
              </span>
            }
          </div>
        </div>

        <!-- Fila 2: Descripción Completa a Ancho Total -->
        @if (p.descripcion) {
          <p class="text-[11px] sm:text-xs text-gray-600 leading-snug mt-1 max-h-16 overflow-y-auto custom-scrollbar break-words">
            {{ p.descripcion }}
          </p>
        }
      </div>
    }
  `
})
export class ModalHeroHeaderComponent {
  readonly store = inject(CustomizationStore);
  readonly onClose = output<void>();
}
