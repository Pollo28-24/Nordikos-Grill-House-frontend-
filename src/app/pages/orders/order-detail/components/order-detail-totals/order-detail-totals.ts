import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-order-detail-totals',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-6 rounded-3xl bg-[#1E1E1E] border-2 border-amber-500/20 space-y-4">
      <div class="flex items-center justify-between text-sm text-zinc-400">
        <span>Subtotal</span>
        <span>\${{ (order().total - (order().propina || 0)) | number:'1.2-2' }}</span>
      </div>
      <div class="flex items-center justify-between text-sm text-zinc-400">
        <span>Propina</span>
        <span>\${{ order().propina || 0 | number:'1.2-2' }}</span>
      </div>
      <div class="h-px bg-white/5"></div>
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold text-white">Total</span>
        <span class="text-2xl font-black text-amber-500">\${{ order().total | number:'1.2-2' }}</span>
      </div>
    </div>
  `
})
export class OrderDetailTotals {
  order = input.required<any>();
}
