import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '@shared/data-access/supabase.service';
import { OrdersService } from '@core/services/orders.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { LoggerService } from '@core/services/logger.service';
import { TickService } from '@core/services/tick.service';
import { Navbar } from '@shared/components/navbar/navbar';
import { TicketPrintComponent } from '@features/tickets/components/ticket-print.component';
import { TicketService } from '@features/tickets/services/ticket.service';

import { OrderDetailHeader } from './components/order-detail-header/order-detail-header';
import { OrderDetailSummary } from './components/order-detail-summary/order-detail-summary';
import { OrderDetailItems } from './components/order-detail-items/order-detail-items';
import { OrderDetailTotals } from './components/order-detail-totals/order-detail-totals';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [LucideAngularModule, Navbar, TicketPrintComponent, OrderDetailHeader, OrderDetailSummary, OrderDetailItems, OrderDetailTotals],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ordersService = inject(OrdersService);
  private feedback = inject(UserFeedbackService);
  private logger = inject(LoggerService);
  private ticketService = inject(TicketService);
  private tickService = inject(TickService);

  orderId = signal<string | null>(null);
  orderIdNumber = computed(() => {
    const id = this.orderId();
    return id ? Number(id) : null;
  });
  order = signal<any>(null);
  items = signal<any[]>([]);
  loading = signal(false);
  showTicket = signal(false);
  ticketType = signal<'account' | 'kitchen'>('account');

  openTicket(type: 'account' | 'kitchen') {
    this.ticketType.set(type);
    this.showTicket.set(true);
  }

  async shareTicketPDF() {
    this.openTicket('account');
  }

  async onTicketReady() {
    const id = this.orderId();
    if (id) {
      const data = await this.ticketService.getTicketData(Number(id));
      if (data) {
        this.ticketService.printTicket(data);
      }
    }
  }

  currentTime = this.tickService.currentTime;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id && !isNaN(Number(id))) {
      this.orderId.set(id);
      this.loadOrder(id);
    } else if (id === 'new') {
      this.router.navigate(['/orders/new']);
    } else {
      this.logger.warn('ID de orden no válido', { id }, 'OrderDetail');
      this.router.navigate(['/orders']);
    }

  }

  getDuration(): string {
    const order = this.order();
    if (!order || !order.fecha_creacion) return '...';
    
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

  async loadOrder(id: string) {
    try {
      this.loading.set(true);
      
      const { order, orderError, items, itemsError } = await this.ordersService.getOrderById(id);

      if (orderError) throw orderError;
      
      if (!order) {
        this.logger.warn('No se encontró la orden', { id }, 'OrderDetail');
        this.feedback.showError('La orden no existe');
        this.router.navigate(['/orders']);
        return;
      }

      this.order.set(order);
      
      if (itemsError) throw itemsError;
      this.items.set(items || []);
    } catch (error: any) {
      this.logger.error('Error loading order', error, 'OrderDetail');
      this.feedback.showError('Error al cargar la orden');
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/orders']);
  }

  addMoreProducts() {
    const id = this.orderId();
    if (id) {
      this.ordersService.clearCart();
      this.ordersService.editingOrderId.set(id);
      this.router.navigate(['/orders/new/browse']);
    }
  }
}
