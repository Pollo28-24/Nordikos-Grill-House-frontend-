import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { OrderStatus, PaymentStatus } from '@core/models/order.model';

@Component({
  selector: 'app-order-filter-bar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './order-filter-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderFilterBar {
  dateFilterType = input.required<'today' | 'week' | 'month' | 'custom'>();
  customStartDate = input.required<string>();
  customEndDate = input.required<string>();
  filteredCount = input.required<number>();

  setDateFilter = output<'today' | 'week' | 'month' | 'custom'>();
  customStartChange = output<string>();
  customEndChange = output<string>();
  applyFilter = output<void>();
  bulkUpdate = output<{ type: 'pedido' | 'pago', status: OrderStatus | PaymentStatus }>();
}
