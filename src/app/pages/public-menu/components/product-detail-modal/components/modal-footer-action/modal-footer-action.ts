import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { CustomizationStore } from '../../store/customization.store';

@Component({
  selector: 'app-modal-footer-action',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CurrencyMxnPipe],
  template: `
    <div class="border-t border-[#E2D7B7]/80 bg-white/95 backdrop-blur-md shrink-0 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] space-y-2">
      
      <!-- Mensaje de Validación de Bloqueo Contextual -->
      @if (!store.validation().isValid && store.validation().blockingMessage) {
        <div class="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <lucide-icon name="alert-circle" class="w-4 h-4 text-amber-600 shrink-0"></lucide-icon>
          <span class="truncate">{{ store.validation().blockingMessage }}</span>
        </div>
      }

      <!-- Fila de Acciones: Stepper de Cantidad Permanente + Botón Agregar al Pedido -->
      <div class="flex items-center gap-2.5 sm:gap-3">
        
        <!-- Stepper de Cantidad Fijo -->
        <div class="flex items-center bg-[#F1ECDF] border border-[#E2D7B7] rounded-2xl p-1 shrink-0 h-12 shadow-xs">
          <button 
            type="button"
            (click)="store.updateQuantity(-1)"
            [disabled]="store.quantity() <= 1"
            class="w-8 h-full flex items-center justify-center rounded-xl bg-white text-gray-700 hover:bg-orange-50 active:scale-90 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation shadow-2xs"
            title="Disminuir cantidad"
            aria-label="Disminuir cantidad"
          >
            <lucide-icon name="minus" class="h-4 w-4"></lucide-icon>
          </button>
          
          <span class="w-8 text-center font-black text-gray-900 text-sm sm:text-base tabular-nums select-none">
            {{ store.quantity() }}
          </span>
          
          <button 
            type="button"
            (click)="store.updateQuantity(1)"
            class="w-8 h-full flex items-center justify-center rounded-xl bg-orange-500 text-white hover:bg-orange-600 active:scale-90 transition cursor-pointer touch-manipulation shadow-2xs"
            title="Aumentar cantidad"
            aria-label="Aumentar cantidad"
          >
            <lucide-icon name="plus" class="h-4 w-4"></lucide-icon>
          </button>
        </div>

        <!-- Botón Principal de Acción -->
        <button 
          type="button"
          (click)="onAddToCart.emit()"
          [disabled]="!store.validation().isValid"
          class="flex-1 h-12 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg transition active:scale-98 flex items-center justify-between px-3.5 sm:px-5 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none cursor-pointer touch-manipulation select-none min-w-0"
          [class.bg-green-600]="isAdded()"
          [class.hover:bg-green-700]="isAdded()"
          [class.shadow-green-600/25]="isAdded()"
          [class.bg-orange-500]="!isAdded() && store.validation().isValid"
          [class.hover:bg-orange-600]="!isAdded() && store.validation().isValid"
          [class.shadow-orange-500/25]="!isAdded() && store.validation().isValid"
        >
          @if (isAdded()) {
            <div class="flex items-center justify-center gap-2 w-full">
              <lucide-icon name="check-circle" class="h-4 w-4"></lucide-icon>
              <span>¡Agregado al pedido!</span>
            </div>
          } @else {
            <div class="flex items-center gap-1.5 sm:gap-2 truncate">
              <lucide-icon name="shopping-bag" class="h-4 w-4 shrink-0"></lucide-icon>
              <span class="truncate">Agregar al pedido</span>
            </div>
            <span class="font-black text-sm sm:text-base tabular-nums shrink-0 ml-1">
              {{ store.pricing().finalTotal | currencyMxn }}
            </span>
          }
        </button>
      </div>
    </div>
  `
})
export class ModalFooterActionComponent {
  readonly store = inject(CustomizationStore);
  readonly isAdded = input<boolean>(false);
  readonly onAddToCart = output<void>();
}
