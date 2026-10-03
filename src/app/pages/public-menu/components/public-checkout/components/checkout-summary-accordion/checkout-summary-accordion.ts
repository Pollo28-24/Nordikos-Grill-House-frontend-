import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { CartItem } from '@core/services/public-cart.service';

@Component({
  selector: 'app-checkout-summary-accordion',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CurrencyMxnPipe],
  template: `
    <div class="border-b border-[#E2D7B7]/50 bg-white/60 px-5 py-2.5 shrink-0">
      <button 
        type="button"
        (click)="toggle.emit()" 
        class="w-full flex items-center justify-between text-left text-xs font-semibold text-gray-700 cursor-pointer select-none"
      >
        <div class="flex items-center gap-2">
          <span class="bg-orange-500/10 text-orange-600 font-bold px-2 py-0.5 rounded-full text-[11px]">
            {{ items().length }} {{ items().length === 1 ? 'producto' : 'productos' }}
          </span>
          <span class="text-gray-500">Resumen del pedido</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-extrabold text-orange-600 text-sm">{{ total() | currencyMxn }}</span>
          <lucide-icon [name]="isExpanded() ? 'chevron-up' : 'chevron-down'" class="h-4 w-4 text-gray-400"></lucide-icon>
        </div>
      </button>

      @if (isExpanded()) {
        <div class="mt-3 pt-2 border-t border-[#E2D7B7]/40 space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
          @for (item of items(); track item.id) {
            <div class="flex items-start justify-between text-xs py-1 text-gray-700">
              <div class="flex flex-col min-w-0 mr-2">
                <span class="font-medium truncate">{{ item.cantidad }}x {{ item.nombre }}{{ item.variante ? ' (' + item.variante.nombre + ')' : '' }}</span>
                @if (item.modificadores && item.modificadores.length > 0) {
                  <div class="flex flex-wrap gap-1 mt-0.5">
                    @for (m of item.modificadores; track m.nombre_modificador) {
                      <span class="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                        +{{ m.nombre_modificador }}@if (m.cantidad > 1) { x{{ m.cantidad }} }
                      </span>
                    }
                  </div>
                }
              </div>
              <span class="font-bold shrink-0 text-gray-900">{{ (item.precio * item.cantidad) | currencyMxn }}</span>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class CheckoutSummaryAccordionComponent {
  items = input.required<CartItem[]>();
  total = input.required<number>();
  isExpanded = input<boolean>(false);
  toggle = output<void>();
}
