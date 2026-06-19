import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-order-detail-totals',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 rounded-xl bg-gradient-to-b from-[#1C1C1E] to-[#161618] border border-white/[0.04] space-y-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
      <div class="flex items-center justify-between text-xs font-semibold">
        <span class="text-zinc-500 uppercase tracking-wider text-[10px]">Subtotal</span>
        <span class="text-white font-bold tabular-nums">\${{ (order().total - (order().propina || 0)) | number:'1.2-2' }}</span>
      </div>
      <div class="flex items-center justify-between text-xs font-semibold">
        <span class="text-zinc-500 uppercase tracking-wider text-[10px]">Propina</span>
        <span class="text-white font-bold tabular-nums">\${{ (order().propina || 0) | number:'1.2-2' }}</span>
      </div>
      
      <div class="border-t border-white/[0.04] pt-2"></div>
      
      <div class="flex items-center justify-between">
        <span class="text-xs font-bold uppercase tracking-wider text-zinc-400">Total</span>
        <span class="text-3xl font-black text-[#FFB300] tabular-nums tracking-tight">\${{ order().total | number:'1.2-2' }}</span>
      </div>
    </div>
  `,
})
export class OrderDetailTotals {
  order = input.required<any>();
}
