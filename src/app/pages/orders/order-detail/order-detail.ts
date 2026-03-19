import { Component, ChangeDetectionStrategy, inject, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../../shared/data-access/supabase.service';
import { OrdersService } from '../../../core/services/orders.service';
import { ToastService } from '../../../core/services/toast.service';
import { Navbar } from '../../../componentes/shared/navbar/navbar';
import { TicketPrintComponent } from '../../../features/tickets/components/ticket-print.component';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, Navbar, TicketPrintComponent],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetail implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService).client;
  private ordersService = inject(OrdersService);
  private toastService = inject(ToastService);

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

  // Señal para actualizar el tiempo real
  private currentTime = signal(Date.now());
  private timer: any;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    
    // Validar que el ID sea numérico para evitar errores PGRST (22P02)
    if (id && !isNaN(Number(id))) {
      this.orderId.set(id);
      this.loadOrder(id);
    } else if (id === 'new') {
      // Caso especial si por error cae aquí
      this.router.navigate(['/orders/new']);
    } else {
      // Si el ID no es válido (ej: "by-service"), redirigir a la lista
      console.warn('ID de orden no válido:', id);
      this.router.navigate(['/orders']);
    }

    // Actualizar tiempo cada segundo
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
      
      // Load order info
      const { data: orderData, error: orderError } = await this.supabase
        .from('orders')
        .select(`
          *,
          clientes(nombre, telefono),
          tipos_servicio(nombre),
          metodos_pago(nombre)
        `)
        .eq('id', id)
        .single();

      if (orderError) throw orderError;
      this.order.set(orderData);

      // Load items
      const { data: itemsData, error: itemsError } = await this.supabase
        .from('order_items')
        .select(`
          *,
          modificadores:order_item_modificadores(*)
        `)
        .eq('order_id', id);

      if (itemsError) throw itemsError;
      this.items.set(itemsData || []);

    } catch (e: any) {
      this.toastService.show('Error al cargar la orden', 'error');
      console.error(e);
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
      console.log('OrderDetail.addMoreProducts - setting editingOrderId:', id);
      this.ordersService.clearCart(); // Empezar con carrito vacío para la edición
      this.ordersService.editingOrderId.set(id);
      this.router.navigate(['/orders/new/browse']);
    }
  }
}
