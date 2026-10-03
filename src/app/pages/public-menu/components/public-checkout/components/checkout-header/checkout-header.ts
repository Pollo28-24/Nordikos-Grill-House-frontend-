import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CheckoutStep } from '../../public-checkout';

@Component({
  selector: 'app-checkout-header',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="flex items-center justify-between px-5 py-4 border-b border-[#E2D7B7]/60 bg-[#F4EEDC]/40 shrink-0">
      <div class="flex items-center gap-2.5">
        @if (step() === 'data' || step() === 'payment') {
          <button 
            type="button"
            (click)="back.emit()" 
            class="p-1 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-black/5 transition cursor-pointer"
            title="Volver al paso anterior"
            aria-label="Volver al paso anterior"
          >
            <lucide-icon name="chevron-left" class="h-5 w-5"></lucide-icon>
          </button>
        }
        <div>
          <h3 class="text-base sm:text-lg font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            @if (step() === 'service') {
              <lucide-icon name="utensils" class="h-5 w-5 text-orange-500"></lucide-icon>
              <span>Elige cómo disfrutar tu pedido</span>
            } @else if (step() === 'data') {
              <lucide-icon name="user" class="h-5 w-5 text-orange-500"></lucide-icon>
              <span>Datos del Pedido</span>
            } @else if (step() === 'payment') {
              <lucide-icon name="dollar-sign" class="h-5 w-5 text-orange-500"></lucide-icon>
              <span>Método de Pago</span>
            } @else {
              <lucide-icon name="check-circle2" class="h-5 w-5 text-green-600"></lucide-icon>
              <span>¡Pedido Confirmado!</span>
            }
          </h3>
          <p class="text-[11px] text-gray-500 font-medium">
            @if (step() === 'service') { Paso 1 de 3: Tipo de servicio }
            @else if (step() === 'data') { Paso 2 de 3: Datos de entrega }
            @else if (step() === 'payment') { Paso 3 de 3: Forma de pago }
            @else { Tu orden ha sido recibida }
          </p>
        </div>
      </div>

      <button 
        type="button"
        (click)="close.emit()" 
        class="text-gray-400 hover:text-gray-700 transition p-1.5 rounded-full hover:bg-black/5 cursor-pointer"
        title="Cerrar modal"
        aria-label="Cerrar modal"
      >
        <lucide-icon name="x" class="h-5 w-5"></lucide-icon>
      </button>
    </div>
  `
})
export class CheckoutHeaderComponent {
  step = input.required<CheckoutStep>();
  back = output<void>();
  close = output<void>();
}
