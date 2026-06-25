import { ChangeDetectionStrategy, Component, input, output, computed } from '@angular/core';
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

  cardClasses = computed(() => {
    const o = this.order();
    const isActive = this.active();
    const urgency = this.urgencyLevel;

    let classes = 'group rounded-xl border p-4 transition-all duration-300 hover:border-white/10 hover:shadow-lg relative cursor-pointer w-full box-border touch-manipulation shadow-md bg-gradient-to-b ';

    if (o.estado_pedido === 'cancelado') {
      classes += 'opacity-55 from-[#161212] to-[#100d0d] ';
      classes += isActive ? 'border-[#FFB300]/40' : 'border-red-950/20';
    } else if (o.estado_pago === 'pagado' && o.estado_pedido === 'entregado') {
      classes += 'opacity-65 from-[#121613] to-[#0f1210] ';
      classes += isActive ? 'border-[#FFB300]/40' : 'border-emerald-950/20';
    } else if (o.estado_pago === 'pagado') {
      classes += 'opacity-100 from-[#141b16] to-[#111612] ';
      classes += isActive ? 'border-[#FFB300]/40' : 'border-emerald-500/20';
    } else {
      classes += 'opacity-100 from-[#1C1C1E] to-[#161618] ';
      if (isActive) {
        classes += 'border-[#FFB300]/40 ';
      } else {
        if (urgency === 'warning') {
          classes += 'order-urgency-warning border-orange-500/30 ';
        } else if (urgency === 'critical') {
          classes += 'order-urgency-critical border-red-500/30 ';
        } else {
          classes += 'border-white/[0.04] ';
        }
      }
    }

    return classes;
  });

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
