import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Router, RouterLink } from '@angular/router';
import { OrdersService } from '@core/services/orders.service';
import { Navbar } from '@shared/components/navbar/navbar';
import { LoggerService } from '@core/services/logger.service';
import { OrderStatus, PaymentStatus } from '@core/models/order.model';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { TicketPrintComponent } from '@features/tickets/components/ticket-print.component';
import { TicketService } from '@features/tickets/services/ticket.service';
import { TickService } from '@core/services/tick.service';

import { OrderKpiBar } from './components/order-kpi-bar/order-kpi-bar';
import { ServiceTabs } from './components/service-tabs/service-tabs';
import { OrderFilterBar } from './components/order-filter-bar/order-filter-bar';
import { OrderCard } from './components/order-card/order-card';

interface ServiceType {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-orders-by-service',
  standalone: true,
  imports: [LucideAngularModule, Navbar, TicketPrintComponent, OrderKpiBar, ServiceTabs, OrderFilterBar, OrderCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-by-service.html'
})
export class OrdersByService implements OnInit, OnDestroy {
  private ordersService = inject(OrdersService);
  private feedback = inject(UserFeedbackService);
  private router = inject(Router);
  private logger = inject(LoggerService);
  private ticketService = inject(TicketService);
  private tickService = inject(TickService);

  orders = this.ordersService.orders;
  loading = this.ordersService.loadingOrders;

  serviceTypes = signal<ServiceType[]>([]);
  selectedTypeId = signal<number | null>(null);

  dateFilterType = signal<'today' | 'week' | 'month' | 'custom'>('today');
  customStartDate = signal<string>(new Date().toISOString().split('T')[0]);
  customEndDate = signal<string>(new Date().toISOString().split('T')[0]);

  quickPrintOrderId = signal<number | string | null>(null);
  quickPrintType = signal<'account' | 'kitchen'>('account');
  showQuickPrintModal = signal(false);

  currentTime = this.tickService.currentTime;

  activeOrderIdMobile = signal<number | string | null>(null);

  filtered = computed(() => {
    const all = this.orders();
    const t = this.selectedTypeId();
    if (!t) return all;
    return all.filter(o => o.tipo_servicio_id === t);
  });

  selectedServiceName = computed(() => {
    const id = this.selectedTypeId();
    if (id == null) return 'Todas las órdenes';
    const s = this.serviceTypes().find(st => st.id === id);
    return s ? s.nombre : 'Todas las órdenes';
  });

  totalSales = computed(() => {
    const filtered = this.filtered();
    return filtered
      .filter(o => o.estado_pedido === 'entregado' && o.estado_pago === 'pagado')
      .reduce((sum, o) => sum + (o.total || 0), 0);
  });

  completedOrdersCount = computed(() => {
    const filtered = this.filtered();
    return filtered.filter(o => o.estado_pedido === 'entregado' && o.estado_pago === 'pagado').length;
  });

  ngOnInit(): void {
    this.loadTypes();
    this.applyDateFilter();
    this.ordersService.subscribeRealtime();
  }

  ngOnDestroy(): void {
    this.ordersService.unsubscribeRealtime();
  }

  async loadTypes() {
    const { data, error } = await this.ordersService.getServiceTypes();
    if (!error) {
      this.serviceTypes.set((data ?? []) as ServiceType[]);
      if (this.serviceTypes().length) {
        this.selectedTypeId.set(this.serviceTypes()[0].id);
      }
    }
  }

  applyDateFilter() {
    const type = this.dateFilterType();
    let start = '';
    let end = new Date().toISOString();

    const now = new Date();

    if (type === 'today') {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      start = d.toISOString();
    } else if (type === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      start = d.toISOString();
    } else if (type === 'month') {
      const d = new Date();
      d.setMonth(d.getMonth() - 1);
      start = d.toISOString();
    } else if (type === 'custom') {
      if (this.customStartDate()) start = new Date(this.customStartDate()).toISOString();
      if (this.customEndDate()) {
        const ed = new Date(this.customEndDate());
        ed.setHours(23, 59, 59, 999);
        end = ed.toISOString();
      }
    }

    if (start) {
      this.ordersService.loadOrders({ start, end });
    } else {
      this.ordersService.loadOrders();
    }
  }

  setDateFilter(type: 'today' | 'week' | 'month' | 'custom') {
    this.dateFilterType.set(type);
    if (type !== 'custom') {
      this.applyDateFilter();
    }
  }

  selectType(id: number | null) {
    this.selectedTypeId.set(id);
  }

  toggleActiveOrderMobile(id: number | string) {
    if (this.activeOrderIdMobile() === id) {
      this.activeOrderIdMobile.set(null);
    } else {
      this.activeOrderIdMobile.set(id);
    }
  }

  refresh() {
    this.applyDateFilter();
  }

  async updateOrderStatus(order: any, newStatus: OrderStatus) {
    const oldStatus = order.estado_pedido;
    const oldCloseDate = order.fecha_cierre;
    const newCloseDate = newStatus === 'entregado' ? new Date().toISOString() : undefined;

    order.estado_pedido = newStatus;
    order.fecha_cierre = newCloseDate;
    
    this.orders.set([...this.orders()]);

    try {
      const { error } = await this.ordersService.updateOrderStatus(order.id, newStatus, newCloseDate ?? null);
      if (error) throw error;
      this.feedback.showSuccess(`Pedido ${newStatus}`);
    } catch (err: any) {
      order.estado_pedido = oldStatus;
      order.fecha_cierre = oldCloseDate;
      this.orders.set([...this.orders()]);
      this.feedback.showError('Error al actualizar pedido');
      this.logger.error('Error updating status', err, 'OrdersByService');
    }
  }

  async updatePaymentStatus(order: any, newStatus: PaymentStatus) {
    const oldStatus = order.estado_pago;
    order.estado_pago = newStatus;
    this.orders.set([...this.orders()]);

    try {
      const { error } = await this.ordersService.updatePaymentStatus(order.id, newStatus);
      if (error) throw error;
      this.feedback.showSuccess(`Pago ${newStatus}`);
    } catch (err: any) {
      order.estado_pago = oldStatus;
      this.orders.set([...this.orders()]);
      this.feedback.showError('Error al actualizar pago');
      this.logger.error('Error updating payment', err, 'OrdersByService');
    }
  }

  navigateToOrderDetail(order: any) {
    this.router.navigate(['/orders', order.id]);
  }

  createNewOrder() {
    this.ordersService.editingOrderId.set(null);
    this.ordersService.clearCart();
    this.router.navigate(['/orders/new']);
  }

  printQuickTicket(orderId: number | string, type: 'account' | 'kitchen' = 'account') {
    this.quickPrintType.set(type);
    this.quickPrintOrderId.set(orderId);
    this.showQuickPrintModal.set(true);
  }

  async onTicketReady() {
    const id = this.quickPrintOrderId();
    if (id) {
      const data = await this.ticketService.getTicketData(Number(id));
      if (data) {
        this.ticketService.printTicket(data);
      }
    }
  }

  async bulkUpdateStatus(type: 'pedido' | 'pago', status: OrderStatus | PaymentStatus) {
    const filteredOrders = this.filtered();
    if (filteredOrders.length === 0) return;

    const ids = filteredOrders.map(o => o.id);
    const oldVal = [...this.orders()];

    const newCloseDate = status === 'entregado' ? new Date().toISOString() : undefined;

    this.orders.update(all => all.map(o => {
      if (ids.includes(o.id)) {
        if (type === 'pedido') {
          return { ...o, estado_pedido: status as OrderStatus, fecha_cierre: newCloseDate };
        } else {
          return { ...o, estado_pago: status as PaymentStatus };
        }
      }
      return o;
    }));

    try {
      const error = type === 'pedido'
        ? (await this.ordersService.bulkUpdateOrderStatus(ids, status as OrderStatus, newCloseDate ?? null)).error
        : (await this.ordersService.bulkUpdatePaymentStatus(ids, status as PaymentStatus)).error;
        
      if (error) throw error;
      this.feedback.showSuccess('Actualización masiva completada');
    } catch (err: any) {
      this.orders.set(oldVal);
      this.feedback.showError('Error en actualización masiva');
    }
  }

}
