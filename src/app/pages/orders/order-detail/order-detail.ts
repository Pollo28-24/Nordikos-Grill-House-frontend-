import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { OrdersService } from '../../../core/services/orders.service';
import { ToastService } from '../../../core/services/toast.service';
import { LoggerService } from '../../../core/services/logger.service';
import { Navbar } from '../../../componentes/shared/navbar/navbar';
import { TicketPrintComponent } from '../../../features/tickets/components/ticket-print.component';
import { TicketService } from '../../../features/tickets/services/ticket.service';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgClass, LucideAngularModule, Navbar, TicketPrintComponent],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService).client;
  private ordersService = inject(OrdersService);
  private toastService = inject(ToastService);
  private logger = inject(LoggerService);
  private ticketService = inject(TicketService);

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

  private currentTime = signal(Date.now());
  private timer: ReturnType<typeof setInterval> | null = null;

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

    this.timer = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
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
      
      const { data, error } = await this.supabase
        .from('orders')
        .select(`
          *,
          clientes (nombre, telefono),
          tipos_servicio (nombre),
          metodos_pago (nombre),
          turnos (nombre)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        this.logger.warn('No se encontró la orden', { id }, 'OrderDetail');
        this.toastService.show('La orden no existe', 'error');
        this.router.navigate(['/orders']);
        return;
      }

      this.order.set(data);
      
      const { data: itemsData, error: itemsError } = await this.supabase
        .from('order_items')
        .select(`
          *,
          modificadores:order_item_modificadores(*)
        `)
        .eq('order_id', id);

      if (itemsError) throw itemsError;
      this.items.set(itemsData || []);
    } catch (error: any) {
      this.logger.error('Error loading order', error, 'OrderDetail');
      this.toastService.show('Error al cargar la orden', 'error');
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
