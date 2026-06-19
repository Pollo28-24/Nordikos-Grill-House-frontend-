import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { OrderStatus, PaymentStatus } from '@core/models/order.model';
import { OrderListItem } from '@core/models/order.model';

@Component({
  selector: 'app-order-card',
  standalone: true,
  imports: [CommonModule, DatePipe, DecimalPipe, NgClass, LucideAngularModule],
  templateUrl: './order-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderCard {
  order = input.required<OrderListItem>();
  active = input.required<boolean>();
  currentTime = input.required<number>();

  toggleActive = output<void>();
  printTicket = output<'kitchen' | 'account'>();
  viewDetail = output<void>();
  updateStatus = output<OrderStatus>();
  updatePaymentStatus = output<PaymentStatus>();

  get duration(): string {
    const o = this.order();
    if (!o.fecha_creacion) return '...';
    
    const current = this.currentTime();
    const start = new Date(o.fecha_creacion).getTime();
    const end = o.fecha_cierre ? new Date(o.fecha_cierre).getTime() : current;
    
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      return `${diffMins}m ${diffSecs}s`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${diffHours}h ${remainingMins}m`;
    }
  }

  get urgencyLevel(): 'normal' | 'warning' | 'critical' {
    const o = this.order();
    // Only active orders (not delivered/cancelled) have urgency
    if (o.estado_pedido === 'entregado' || o.estado_pedido === 'cancelado') return 'normal';
    if (o.fecha_cierre) return 'normal';

    const current = this.currentTime();
    const start = new Date(o.fecha_creacion).getTime();
    const diffMins = Math.floor((current - start) / 60000);

    if (diffMins >= 25) return 'critical';
    if (diffMins >= 15) return 'warning';
    return 'normal';
  }

  get elapsedMins(): number {
    const o = this.order();
    if (!o.fecha_creacion) return 0;
    const current = this.currentTime();
    const start = new Date(o.fecha_creacion).getTime();
    return Math.floor((current - start) / 60000);
  }
}
