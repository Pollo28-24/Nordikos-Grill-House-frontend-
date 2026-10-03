import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-checkout-service-step',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="space-y-3">
      <p class="text-xs text-gray-600 leading-relaxed">
        Seleccioná dónde vas a comer. Prepararemos el formulario específicamente para tu servicio sin pedirte datos innecesarios:
      </p>

      <div class="grid gap-3 sm:grid-cols-3 pt-1">
        @for (st of serviceTypes(); track st.id) {
          <button 
            type="button" 
            (click)="selectService.emit(st)"
            class="p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 active:scale-98 cursor-pointer select-none"
            [ngClass]="{
              'border-orange-500 bg-orange-50/50 shadow-md': selectedServiceId() === st.id,
              'border-[#E2D7B7] bg-white hover:border-orange-300 hover:bg-orange-50/20': selectedServiceId() !== st.id
            }"
          >
            <div class="flex items-center justify-between w-full">
              <div 
                class="w-10 h-10 rounded-xl flex items-center justify-center transition"
                [ngClass]="selectedServiceId() === st.id ? 'bg-orange-500 text-white' : 'bg-[#F4EEDC] text-gray-700'"
              >
                @if (getServiceIcon(st.nombre) === 'utensils') {
                  <lucide-icon name="utensils" class="w-5 h-5"></lucide-icon>
                } @else if (getServiceIcon(st.nombre) === 'bike') {
                  <lucide-icon name="bike" class="w-5 h-5"></lucide-icon>
                } @else {
                  <lucide-icon name="shopping-bag" class="w-5 h-5"></lucide-icon>
                }
              </div>

              <div 
                class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition"
                [ngClass]="selectedServiceId() === st.id ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-300'"
              >
                @if (selectedServiceId() === st.id) {
                  <div class="w-2 h-2 rounded-full bg-white"></div>
                }
              </div>
            </div>

            <div>
              <h4 class="font-extrabold text-sm text-gray-900">{{ st.nombre }}</h4>
              <p class="text-[11px] text-gray-500 mt-0.5 leading-snug">
                {{ getServiceDescription(st.nombre) }}
              </p>
            </div>
          </button>
        }
      </div>
    </div>
  `
})
export class CheckoutServiceStepComponent {
  serviceTypes = input.required<{ id: number; nombre: string }[]>();
  selectedServiceId = input<number | null>(null);
  selectService = output<{ id: number; nombre: string }>();

  getServiceIcon(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('mesa') || n.includes('comedor')) return 'utensils';
    if (n.includes('domicilio') || n.includes('delivery')) return 'bike';
    return 'shopping-bag';
  }

  getServiceDescription(name: string): string {
    const n = name.toLowerCase();
    if (n.includes('mesa') || n.includes('comedor')) return 'Te lo llevamos a tu mesa lista para disfrutar.';
    if (n.includes('domicilio') || n.includes('delivery')) return 'Envío rápido con geolocalización o dirección.';
    return 'Lo prepararemos para que solo pases a recogerlo.';
  }
}
