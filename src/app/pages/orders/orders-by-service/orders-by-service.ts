import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Router, RouterLink } from '@angular/router';
import { OrdersService } from '../../../core/services/orders.service';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { Navbar } from '../../../componentes/shared/navbar/navbar';
import { LoggerService } from '../../../core/services/logger.service';

import { OrderStatus, PaymentStatus } from '../../../core/models/order.model';
import { ToastService } from '../../../core/services/toast.service';
import { TicketPrintComponent } from '../../../features/tickets/components/ticket-print.component';
import { TicketService } from '../../../features/tickets/services/ticket.service';

interface ServiceType {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-orders-by-service',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgClass, LucideAngularModule, Navbar, TicketPrintComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './orders-by-service.html'
})
export class OrdersByService implements OnInit, OnDestroy {
  private ordersService = inject(OrdersService);
  private supabase = inject(SupabaseService).client;
  private toastService = inject(ToastService);
  private router = inject(Router);
  private logger = inject(LoggerService);
  private ticketService = inject(TicketService);

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

  private currentTime = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;

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

    this.timer = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 1000);
  }

  ngOnDestroy(): void {
    this.ordersService.unsubscribeRealtime();
    if (this.timer) clearInterval(this.timer);
  }

  async loadTypes() {
    const { data, error } = await this.supabase
      .from('tipos_servicio')
      .select('id,nombre')
      .order('id');
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
    
    order.estado_pedido = newStatus;
    if (newStatus === 'entregado') order.fecha_cierre = new Date().toISOString();
    this.orders.set([...this.orders()]);

    try {
      const { error } = await this.supabase
        .from('orders')
        .update({ 
          estado_pedido: newStatus,
          fecha_cierre: newStatus === 'entregado' ? new Date().toISOString() : null
        })
        .eq('id', order.id);

      if (error) throw error;
      this.toastService.show(`Pedido ${newStatus}`, 'success');
    } catch (err: any) {
      order.estado_pedido = oldStatus;
      this.orders.set([...this.orders()]);
      this.toastService.show('Error al actualizar pedido', 'error');
      this.logger.error('Error updating status', err, 'OrdersByService');
    }
  }

  async updatePaymentStatus(order: any, newStatus: PaymentStatus) {
    const oldStatus = order.estado_pago;
    
    order.estado_pago = newStatus;
    this.orders.set([...this.orders()]);

    try {
      const { error } = await this.supabase
        .from('orders')
        .update({ estado_pago: newStatus })
        .eq('id', order.id);

      if (error) throw error;
      this.toastService.show(`Pago ${newStatus}`, 'success');
    } catch (err: any) {
      order.estado_pago = oldStatus;
      this.orders.set([...this.orders()]);
      this.toastService.show('Error al actualizar pago', 'error');
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
    const updateData: any = type === 'pedido' ? { 
      estado_pedido: status,
      fecha_cierre: status === 'entregado' ? new Date().toISOString() : null
    } : { 
      estado_pago: status 
    };

    this.orders.update(all => all.map(o => {
      if (ids.includes(o.id)) {
        return { ...o, ...updateData };
      }
      return o;
    }));

    try {
      const { error } = await this.supabase
        .from('orders')
        .update(updateData)
        .in('id', ids);

      if (error) throw error;
      this.toastService.show('Actualización masiva completada', 'success');
    } catch (err: any) {
      this.applyDateFilter();
      this.toastService.show('Error en actualización masiva', 'error');
    }
  }

  getDuration(order: any): string {
    if (!order.fecha_creacion) return '...';
    
    const current = this.currentTime();
    const start = new Date(order.fecha_creacion).getTime();
    const end = order.fecha_cierre ? new Date(order.fecha_cierre).getTime() : current;
    
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
}
