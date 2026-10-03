import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';

@Component({
  selector: 'app-checkout-payment-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, CurrencyMxnPipe],
  template: `
    <div [formGroup]="form()" class="space-y-4">
      
      <!-- Card con Total Destacado -->
      <div class="bg-[#F4EEDC]/60 border border-[#E2D7B7] p-4 rounded-2xl flex items-center justify-between">
        <div>
          <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Total a Pagar</span>
          <p class="text-xl font-black text-gray-900 mt-0.5">{{ total() | currencyMxn }}</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600">
          <lucide-icon name="dollar-sign" class="w-5 h-5"></lucide-icon>
        </div>
      </div>

      <div class="space-y-2 pt-1">
        <label class="block text-xs font-bold text-gray-700">
          ¿Cómo deseas pagar al recibir/recoger?
        </label>

        <div class="space-y-2">
          <!-- Efectivo -->
          <label class="flex items-center justify-between p-3.5 bg-white border-2 rounded-2xl cursor-pointer transition hover:border-orange-300"
            [class.border-orange-500]="form().get('metodo_pago')?.value === 'efectivo'"
            [class.bg-orange-50/20]="form().get('metodo_pago')?.value === 'efectivo'"
            [class.border-[#E2D7B7]]="form().get('metodo_pago')?.value !== 'efectivo'">
            <div class="flex items-center gap-3">
              <input type="radio" formControlName="metodo_pago" value="efectivo" class="text-orange-500 focus:ring-orange-500 h-4 w-4" />
              <div>
                <h4 class="text-xs sm:text-sm font-bold text-gray-900">Efectivo</h4>
                <p class="text-[11px] text-gray-500">Pagas en persona al recibir tu pedido</p>
              </div>
            </div>
            <lucide-icon name="banknote" class="w-5 h-5 text-gray-400"></lucide-icon>
          </label>

          <!-- Tarjeta / Terminal -->
          <label class="flex items-center justify-between p-3.5 bg-white border-2 rounded-2xl cursor-pointer transition hover:border-orange-300"
            [class.border-orange-500]="form().get('metodo_pago')?.value === 'tarjeta'"
            [class.bg-orange-50/20]="form().get('metodo_pago')?.value === 'tarjeta'"
            [class.border-[#E2D7B7]]="form().get('metodo_pago')?.value !== 'tarjeta'">
            <div class="flex items-center gap-3">
              <input type="radio" formControlName="metodo_pago" value="tarjeta" class="text-orange-500 focus:ring-orange-500 h-4 w-4" />
              <div>
                <h4 class="text-xs sm:text-sm font-bold text-gray-900">Tarjeta (Terminal Física)</h4>
                <p class="text-[11px] text-gray-500">Llevamos terminal para cobro con tarjeta</p>
              </div>
            </div>
            <lucide-icon name="credit-card" class="w-5 h-5 text-gray-400"></lucide-icon>
          </label>

          <!-- Transferencia -->
          <label class="flex items-center justify-between p-3.5 bg-white border-2 rounded-2xl cursor-pointer transition hover:border-orange-300"
            [class.border-orange-500]="form().get('metodo_pago')?.value === 'transferencia'"
            [class.bg-orange-50/20]="form().get('metodo_pago')?.value === 'transferencia'"
            [class.border-[#E2D7B7]]="form().get('metodo_pago')?.value !== 'transferencia'">
            <div class="flex items-center gap-3">
              <input type="radio" formControlName="metodo_pago" value="transferencia" class="text-orange-500 focus:ring-orange-500 h-4 w-4" />
              <div>
                <h4 class="text-xs sm:text-sm font-bold text-gray-900">Transferencia Bancaria</h4>
                <p class="text-[11px] text-gray-500">Te enviamos los datos para realizar SPEI</p>
              </div>
            </div>
            <lucide-icon name="smartphone" class="w-5 h-5 text-gray-400"></lucide-icon>
          </label>
        </div>
      </div>

      <!-- Aviso de Preparación -->
      <div class="p-3 bg-zinc-50 border border-gray-200 rounded-xl flex items-start gap-2.5 text-xs text-gray-600">
        <lucide-icon name="clock" class="w-4 h-4 text-gray-400 shrink-0 mt-0.5"></lucide-icon>
        <span>El tiempo estimado de preparación es de 20 a 35 minutos según la demanda de cocina.</span>
      </div>

    </div>
  `
})
export class CheckoutPaymentStepComponent {
  form = input.required<FormGroup>();
  total = input.required<number>();
}
