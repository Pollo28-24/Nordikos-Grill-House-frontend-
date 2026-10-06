import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export type OrderStatusFilterValue = 'all' | 'pendiente' | 'confirmado' | 'entregado' | 'cancelado';
export type PaymentStatusFilterValue = 'all' | 'pendiente' | 'pagado';

interface FilterChip<T> {
  value: T;
  label: string;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-order-status-filter',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
      <!-- Sección 1: Estado del Pedido -->
      <div class="space-y-2">
        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 block">
          Estado del Pedido
        </span>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filtro de estado de pedido">
          @for (chip of orderChips; track chip.value) {
            <button 
              type="button"
              (click)="toggleStatus(chip.value)"
              [attr.aria-pressed]="isStatusActive(chip.value)"
              [class.bg-zinc-100]="isStatusActive(chip.value)"
              [class.text-zinc-950]="isStatusActive(chip.value)"
              [class.font-bold]="isStatusActive(chip.value)"
              [class.border-zinc-100]="isStatusActive(chip.value)"
              [class.shadow-sm]="isStatusActive(chip.value)"
              [class.bg-zinc-900/60]="!isStatusActive(chip.value)"
              [class.text-zinc-300]="!isStatusActive(chip.value)"
              [class.border-white/10]="!isStatusActive(chip.value)"
              [class.hover:border-white/20]="!isStatusActive(chip.value)"
              [class.hover:bg-white/5]="!isStatusActive(chip.value)"
              class="h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer flex items-center gap-2 border">
              @if (isStatusActive(chip.value) && chip.value !== 'all') {
                <lucide-icon name="check" class="w-3.5 h-3.5 text-zinc-950 shrink-0"></lucide-icon>
              } @else {
                <lucide-icon [name]="chip.icon" class="w-3.5 h-3.5 shrink-0" [class]="isStatusActive(chip.value) ? 'text-zinc-950' : chip.colorClass"></lucide-icon>
              }
              <span>{{ chip.label }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Sección 2: Estado del Pago -->
      <div class="space-y-2">
        <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 block">
          Estado del Pago
        </span>
        <div class="flex flex-wrap gap-2" role="group" aria-label="Filtro de estado de pago">
          @for (chip of paymentChips; track chip.value) {
            <button 
              type="button"
              (click)="togglePayment(chip.value)"
              [attr.aria-pressed]="isPaymentActive(chip.value)"
              [class.bg-zinc-100]="isPaymentActive(chip.value)"
              [class.text-zinc-950]="isPaymentActive(chip.value)"
              [class.font-bold]="isPaymentActive(chip.value)"
              [class.border-zinc-100]="isPaymentActive(chip.value)"
              [class.shadow-sm]="isPaymentActive(chip.value)"
              [class.bg-zinc-900/60]="!isPaymentActive(chip.value)"
              [class.text-zinc-300]="!isPaymentActive(chip.value)"
              [class.border-white/10]="!isPaymentActive(chip.value)"
              [class.hover:border-white/20]="!isPaymentActive(chip.value)"
              [class.hover:bg-white/5]="!isPaymentActive(chip.value)"
              class="h-11 min-h-[44px] px-3.5 sm:px-4 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 active:scale-95 touch-manipulation cursor-pointer flex items-center gap-2 border">
              @if (isPaymentActive(chip.value) && chip.value !== 'all') {
                <lucide-icon name="check" class="w-3.5 h-3.5 text-zinc-950 shrink-0"></lucide-icon>
              } @else {
                <lucide-icon [name]="chip.icon" class="w-3.5 h-3.5 shrink-0" [class]="isPaymentActive(chip.value) ? 'text-zinc-950' : chip.colorClass"></lucide-icon>
              }
              <span>{{ chip.label }}</span>
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class OrderStatusFilter {
  currentStatus = input<OrderStatusFilterValue[]>(['all']);
  currentPayment = input<PaymentStatusFilterValue[]>(['all']);

  statusFilter = output<OrderStatusFilterValue[]>();
  paymentFilter = output<PaymentStatusFilterValue[]>();

  orderChips: FilterChip<OrderStatusFilterValue>[] = [
    { value: 'all', label: 'Todas', icon: 'list-ordered', colorClass: 'text-zinc-400' },
    { value: 'pendiente', label: 'Pendientes', icon: 'clock', colorClass: 'text-sky-400' },
    { value: 'confirmado', label: 'Confirmadas', icon: 'check-circle', colorClass: 'text-violet-400' },
    { value: 'entregado', label: 'Entregadas', icon: 'check-circle2', colorClass: 'text-emerald-400' },
    { value: 'cancelado', label: 'Canceladas', icon: 'ban', colorClass: 'text-zinc-500' },
  ];

  paymentChips: FilterChip<PaymentStatusFilterValue>[] = [
    { value: 'all', label: 'Todos', icon: 'receipt', colorClass: 'text-zinc-400' },
    { value: 'pendiente', label: 'Sin pagar', icon: 'alert-circle', colorClass: 'text-rose-400' },
    { value: 'pagado', label: 'Pagadas', icon: 'check-circle2', colorClass: 'text-teal-400' },
  ];

  isStatusActive(val: OrderStatusFilterValue): boolean {
    return this.currentStatus().includes(val);
  }

  isPaymentActive(val: PaymentStatusFilterValue): boolean {
    return this.currentPayment().includes(val);
  }

  toggleStatus(val: OrderStatusFilterValue) {
    if (val === 'all') {
      this.statusFilter.emit(['all']);
      return;
    }

    let current = [...this.currentStatus()];
    // Remove 'all'
    current = current.filter(v => v !== 'all');

    if (current.includes(val)) {
      current = current.filter(v => v !== val);
    } else {
      current.push(val);
    }

    if (current.length === 0) {
      this.statusFilter.emit(['all']);
    } else {
      this.statusFilter.emit(current);
    }
  }

  togglePayment(val: PaymentStatusFilterValue) {
    if (val === 'all') {
      this.paymentFilter.emit(['all']);
      return;
    }

    let current = [...this.currentPayment()];
    // Remove 'all'
    current = current.filter(v => v !== 'all');

    if (current.includes(val)) {
      current = current.filter(v => v !== val);
    } else {
      current.push(val);
    }

    if (current.length === 0) {
      this.paymentFilter.emit(['all']);
    } else {
      this.paymentFilter.emit(current);
    }
  }
}

