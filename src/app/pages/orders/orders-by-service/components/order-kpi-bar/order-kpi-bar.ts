import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-kpi-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8 animate-in fade-in slide-in-from-top-2 duration-500">
      <!-- Tarjeta Pendientes -->
      <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 shadow-lg shadow-black/10">
        <span class="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Pendientes</span>
        <span class="text-xl md:text-3xl font-black text-[#FFB300] tabular-nums leading-none mt-1">{{ pendingCount() }}</span>
      </div>
      
      <!-- Tarjeta Sin Pagar -->
      <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 shadow-lg shadow-black/10">
        <span class="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Sin Pagar</span>
        <span class="text-xl md:text-3xl font-black tabular-nums leading-none mt-1 transition-colors duration-300"
              [class.text-rose-500]="unpaidCount() > 0"
              [class.text-zinc-400]="unpaidCount() === 0">
          {{ unpaidCount() }}
        </span>
      </div>

      <!-- Tarjeta Entregadas -->
      <div class="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 shadow-lg shadow-black/10">
        <span class="text-[9px] md:text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Entregadas</span>
        <span class="text-xl md:text-3xl font-black text-emerald-500 tabular-nums leading-none mt-1">{{ deliveredCount() }}</span>
      </div>
    </div>
  `
})
export class OrderKpiBar {
  pendingCount = input.required<number>();
  unpaidCount = input.required<number>();
  deliveredCount = input.required<number>();
}
