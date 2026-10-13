import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  input,
  output,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OrderStatusFilterValue, PaymentStatusFilterValue } from '../order-status-filter/order-status-filter';
import {
  DateFilterType,
  PERIOD_OPTIONS,
  ORDER_STATUS_CHIPS,
  PAYMENT_STATUS_CHIPS
} from './order-filter-modal.models';

export * from './order-filter-modal.models';

@Component({
  selector: 'app-order-filter-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './order-filter-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderFilterModal {
  @ViewChild('modalContainer') modalContainer?: ElementRef<HTMLDivElement>;

  // Inputs
  isOpen = input.required<boolean>();
  dateFilterType = input.required<DateFilterType>();
  customStartDate = input.required<string>();
  customEndDate = input.required<string>();
  statusFilter = input.required<OrderStatusFilterValue[]>();
  paymentFilter = input.required<PaymentStatusFilterValue[]>();
  filteredCount = input<number>(0);
  hasActiveFilters = input<boolean>(false);
  activeFiltersCount = input<number>(0);

  // Outputs
  close = output<void>();
  setDateFilter = output<DateFilterType>();
  customStartChange = output<string>();
  customEndChange = output<string>();
  applyCustomDate = output<void>();
  setStatusFilter = output<OrderStatusFilterValue[]>();
  setPaymentFilter = output<PaymentStatusFilterValue[]>();
  clearAllFilters = output<void>();

  // Opciones y Constantes
  readonly periodOptions = PERIOD_OPTIONS;
  readonly orderStatusChips = ORDER_STATUS_CHIPS;
  readonly paymentStatusChips = PAYMENT_STATUS_CHIPS;

  constructor() {
    // Al abrir el modal, auto-enfocamos el contenedor para soporte de teclado y accesibilidad
    effect(() => {
      if (this.isOpen()) {
        setTimeout(() => this.modalContainer?.nativeElement?.focus(), 50);
      }
    });
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(e: Event) {
    if (this.isOpen()) {
      e.stopPropagation();
      this.close.emit();
    }
  }

  onBackdropClick() {
    this.close.emit();
  }

  isStatusActive(val: OrderStatusFilterValue): boolean {
    return this.statusFilter().includes(val);
  }

  isPaymentActive(val: PaymentStatusFilterValue): boolean {
    return this.paymentFilter().includes(val);
  }

  toggleStatus(val: OrderStatusFilterValue) {
    if (val === 'all') {
      this.setStatusFilter.emit(['all']);
      return;
    }

    let current = [...this.statusFilter()].filter(v => v !== 'all');

    if (current.includes(val)) {
      current = current.filter(v => v !== val);
    } else {
      current.push(val);
    }

    this.setStatusFilter.emit(current.length === 0 ? ['all'] : current);
  }

  togglePayment(val: PaymentStatusFilterValue) {
    if (val === 'all') {
      this.setPaymentFilter.emit(['all']);
      return;
    }

    let current = [...this.paymentFilter()].filter(v => v !== 'all');

    if (current.includes(val)) {
      current = current.filter(v => v !== val);
    } else {
      current.push(val);
    }

    this.setPaymentFilter.emit(current.length === 0 ? ['all'] : current);
  }
}
