import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-kpi-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (layout() === 'desktop') {
      <div class="hidden md:flex items-center gap-4 px-4 py-2 rounded-2xl bg-white/5 border border-white/5 animate-in fade-in slide-in-from-right-2">
        <div class="flex flex-col">
          <span class="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Ventas Totales</span>
          <span class="text-lg font-black text-emerald-500 tabular-nums">\${{ totalSales() | number:'1.2-2' }}</span>
        </div>
        <div class="w-px h-8 bg-white/10"></div>
        <div class="flex flex-col">
          <span class="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Completadas</span>
          <span class="text-lg font-black text-white tabular-nums">{{ completedCount() }}</span>
        </div>
      </div>
    } @else {
      <div class="md:hidden grid grid-cols-2 gap-3 mb-8 animate-in fade-in slide-in-from-top-2">
        <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
          <span class="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Ventas Totales</span>
          <span class="text-xl font-black text-emerald-500 tabular-nums">\${{ totalSales() | number:'1.2-2' }}</span>
        </div>
        <div class="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
          <span class="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Completadas</span>
          <span class="text-xl font-black text-white tabular-nums">{{ completedCount() }}</span>
        </div>
      </div>
    }
  `
})
export class OrderKpiBar {
  layout = input<'desktop' | 'mobile'>('desktop');
  totalSales = input.required<number>();
  completedCount = input.required<number>();
}
