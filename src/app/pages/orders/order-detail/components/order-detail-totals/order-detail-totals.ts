import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-order-detail-totals',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-5 sm:p-6 rounded-2xl bg-[#1A1A1A] border border-white/10 space-y-4 shadow-lg animate-in fade-in slide-in-from-top-3 duration-300">
      
      <!-- Subtotal -->
      <div class="flex items-center justify-between">
        <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Subtotal</span>
        <span class="text-sm sm:text-base font-bold text-zinc-200 tabular-nums">\${{ (order().total - (order().propina || 0)) | number:'1.2-2' }}</span>
      </div>

      <!-- Propina -->
      <div class="flex items-center justify-between">
        <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">Propina</span>
        <span class="text-sm sm:text-base font-bold text-zinc-200 tabular-nums">\${{ (order().propina || 0) | number:'1.2-2' }}</span>
      </div>
      
      <!-- Divisor -->
      <div class="border-t border-white/10 pt-2"></div>
      
      <!-- Total Económico (Punto Focal) -->
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <span class="text-xs sm:text-sm font-black uppercase tracking-wider text-zinc-200">Total a Pagar</span>
          <span class="text-[10px] sm:text-xs font-semibold text-zinc-500 mt-0.5">IVA Incluido</span>
        </div>
        <span class="text-3xl sm:text-4xl font-black text-[#FFB300] tabular-nums tracking-tight drop-shadow-sm">\${{ order().total | number:'1.2-2' }}</span>
      </div>
    </div>
  `,
})
export class OrderDetailTotals {
  order = input.required<any>();
}
