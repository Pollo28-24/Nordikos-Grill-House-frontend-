import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-order-detail-totals',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-5 rounded-2xl bg-zinc-900/40 border border-white/5 glass-panel space-y-3.5 shadow-lg animate-in fade-in slide-in-from-top-3 duration-300">
      
      <!-- Subtotal -->
      <div class="flex items-center justify-between text-xs font-semibold">
        <span class="text-zinc-500 uppercase tracking-wider text-[9px]">Subtotal</span>
        <span class="text-zinc-200 font-bold tabular-nums">\${{ (order().total - (order().propina || 0)) | number:'1.2-2' }}</span>
      </div>

      <!-- Propina -->
      <div class="flex items-center justify-between text-xs font-semibold">
        <span class="text-zinc-500 uppercase tracking-wider text-[9px]">Propina</span>
        <span class="text-zinc-200 font-bold tabular-nums">\${{ (order().propina || 0) | number:'1.2-2' }}</span>
      </div>
      
      <!-- Divisor -->
      <div class="border-t border-white/5 pt-3"></div>
      
      <!-- Total Económico (Punto Focal) -->
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <span class="text-[9px] font-black uppercase tracking-wider text-zinc-400">Total a Pagar</span>
          <span class="text-[9px] font-semibold text-zinc-600 mt-0.5">IVA Incluido</span>
        </div>
        <span class="text-3xl sm:text-4xl font-black text-[#FFB300] tabular-nums tracking-tight text-glow-gold">\${{ order().total | number:'1.2-2' }}</span>
      </div>
    </div>
  `,
})
export class OrderDetailTotals {
  order = input.required<any>();
}
