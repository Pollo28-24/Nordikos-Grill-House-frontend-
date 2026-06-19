import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type OrderStatusFilterValue = 'all' | 'pendiente' | 'confirmado' | 'entregado' | 'cancelado';
export type PaymentStatusFilterValue = 'all' | 'pendiente' | 'pagado';

@Component({
  selector: 'app-order-status-filter',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
      <!-- Fila 1: Pedidos -->
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <div class="flex items-center gap-1.5 shrink-0 text-zinc-500 text-[10px] font-bold uppercase tracking-wider md:w-24">
          <lucide-icon name="list-ordered" class="w-3.5 h-3.5 text-zinc-500"></lucide-icon>
          <span>Pedido</span>
        </div>
        <div class="inline-flex p-1 gap-1 rounded-lg bg-black/40 border border-white/5 overflow-x-auto scrollbar-hide flex-nowrap max-w-full">
          @for (chip of orderChips; track chip.value) {
            <button 
              (click)="statusFilter.emit(chip.value)"
              [class]="getOrderChipClasses(chip.value)"
              class="shrink-0 flex items-center gap-1.5 px-3.5 h-8 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 touch-manipulation whitespace-nowrap"
            >
              <lucide-icon [name]="chip.icon" class="w-3.5 h-3.5"></lucide-icon>
              <span>{{ chip.label }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Fila 2: Pagos -->
      <div class="flex flex-col md:flex-row md:items-center gap-3">
        <div class="flex items-center gap-1.5 shrink-0 text-zinc-500 text-[10px] font-bold uppercase tracking-wider md:w-24">
          <lucide-icon name="dollar-sign" class="w-3.5 h-3.5 text-zinc-500"></lucide-icon>
          <span>Pago</span>
        </div>
        <div class="inline-flex p-1 gap-1 rounded-lg bg-black/40 border border-white/5 overflow-x-auto scrollbar-hide flex-nowrap max-w-full">
          @for (chip of paymentChips; track chip.value) {
            <button 
              (click)="paymentFilter.emit(chip.value)"
              [class]="getPaymentChipClasses(chip.value)"
              class="shrink-0 flex items-center gap-1.5 px-3.5 h-8 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 touch-manipulation whitespace-nowrap"
            >
              <lucide-icon [name]="chip.icon" class="w-3.5 h-3.5"></lucide-icon>
              <span>{{ chip.label }}</span>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host { display: block; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `
})
export class OrderStatusFilter {
  currentStatus = input<OrderStatusFilterValue>('all');
  currentPayment = input<PaymentStatusFilterValue>('all');

  statusFilter = output<OrderStatusFilterValue>();
  paymentFilter = output<PaymentStatusFilterValue>();

  orderChips: { value: OrderStatusFilterValue; label: string; icon: string }[] = [
    { value: 'all', label: 'Todas', icon: 'list-ordered' },
    { value: 'pendiente', label: 'Pendientes', icon: 'chef-hat' },
    { value: 'confirmado', label: 'Confirmadas', icon: 'check-circle' },
    { value: 'entregado', label: 'Entregadas', icon: 'check-circle2' },
    { value: 'cancelado', label: 'Canceladas', icon: 'ban' },
  ];

  paymentChips: { value: PaymentStatusFilterValue; label: string; icon: string }[] = [
    { value: 'all', label: 'Todo pago', icon: 'receipt' },
    { value: 'pendiente', label: 'Sin pagar', icon: 'dollar-sign' },
    { value: 'pagado', label: 'Pagadas', icon: 'check-circle2' },
  ];

  getOrderChipClasses(value: OrderStatusFilterValue) {
    const isCurrent = this.currentStatus() === value;
    if (!isCurrent) {
      return 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]';
    }
    
    if (value === 'all') return 'bg-white/10 text-white';
    if (value === 'pendiente') return 'bg-white/10 text-[#FFB300]';
    if (value === 'confirmado') return 'bg-white/10 text-blue-400';
    if (value === 'entregado') return 'bg-white/10 text-emerald-400';
    if (value === 'cancelado') return 'bg-white/10 text-rose-500';
    return '';
  }

  getPaymentChipClasses(value: PaymentStatusFilterValue) {
    const isCurrent = this.currentPayment() === value;
    if (!isCurrent) {
      return 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]';
    }
    
    if (value === 'all') return 'bg-white/10 text-white';
    if (value === 'pendiente') return 'bg-white/10 text-rose-500';
    if (value === 'pagado') return 'bg-white/10 text-emerald-400';
    return '';
  }
}

