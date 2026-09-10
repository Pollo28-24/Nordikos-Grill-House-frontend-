import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-kpi-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <!-- Tarjeta Pendientes -->
      <div class="p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl bg-[#18181A] border border-white/10 flex flex-col gap-0.5 sm:gap-1 shadow-sm">
        <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider truncate">Pendientes</span>
        <span class="text-lg sm:text-2xl md:text-3xl font-black text-[#FFB300] tabular-nums leading-none mt-0.5">{{ pendingCount() }}</span>
      </div>
      
      <!-- Tarjeta Sin Pagar -->
      <div class="p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl bg-[#18181A] border border-white/10 flex flex-col gap-0.5 sm:gap-1 shadow-sm">
        <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider truncate">Sin Pagar</span>
        <span class="text-lg sm:text-2xl md:text-3xl font-black tabular-nums leading-none mt-0.5 transition-colors duration-300"
              [class.text-rose-400]="unpaidCount() > 0"
              [class.text-zinc-500]="unpaidCount() === 0">
          {{ unpaidCount() }}
        </span>
      </div>

      <!-- Tarjeta Entregadas -->
      <div class="p-2.5 sm:p-3.5 md:p-4 rounded-xl sm:rounded-2xl bg-[#18181A] border border-white/10 flex flex-col gap-0.5 sm:gap-1 shadow-sm">
        <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider truncate">Entregadas</span>
        <span class="text-lg sm:text-2xl md:text-3xl font-black text-emerald-400 tabular-nums leading-none mt-0.5">{{ deliveredCount() }}</span>
      </div>
    </div>
  `
})
export class OrderKpiBar {
  pendingCount = input.required<number>();
  unpaidCount = input.required<number>();
  deliveredCount = input.required<number>();
}
