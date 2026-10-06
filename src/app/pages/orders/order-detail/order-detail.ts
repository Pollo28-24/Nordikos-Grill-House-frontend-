import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ActivatedRoute, Router } from '@angular/router';
import { OrdersService } from '@core/services/orders.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { LoggerService } from '@core/services/logger.service';
import { TickService } from '@core/services/tick.service';
import { TicketPrintComponent } from '@features/tickets/components/ticket-print.component';
import { TicketService } from '@features/tickets/services/ticket.service';

import { OrderDetailHeader } from './components/order-detail-header/order-detail-header';
import { OrderDetailSummary, ServiceTypeChangeEvent } from './components/order-detail-summary/order-detail-summary';
import { OrderDetailItems } from './components/order-detail-items/order-detail-items';
import { OrderDetailTotals } from './components/order-detail-totals/order-detail-totals';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    TicketPrintComponent,
    OrderDetailHeader,
    OrderDetailSummary,
    OrderDetailItems,
    OrderDetailTotals
  ],
  templateUrl: './order-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TickService]
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

  // Estado local como respaldo / inicialización
  private rawOrder = signal<any>(null);
  private rawItems = signal<any[]>([]);

  // Reactividad pura hacia el Aggregate Root del dominio
  order = computed(() => {
    const agg = this.ordersService.currentOrderAggregate();
    const id = this.orderIdNumber();
    if (agg && agg.id === id) {
      return agg.getSnapshot();
    }
    return this.rawOrder();
  });

  items = computed(() => {
    const agg = this.ordersService.currentOrderAggregate();
    const id = this.orderIdNumber();
    if (agg && agg.id === id) {
      return [...agg.items];
    }
    return this.rawItems();
  });

  syncStatusMap = this.ordersService.orderSyncStatus;
  orderLevelSync = this.ordersService.orderLevelSyncStatus;

  loading = signal(false);
  showTicket = signal(false);
  ticketType = signal<'account' | 'kitchen'>('account');
  autoPrint = signal<boolean>(true);
  currentTime = this.tickService.currentTime;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id && /^\d+$/.test(id)) {
      this.orderId.set(id);
      this.loadOrder(id);
    } else if (id === 'new') {
      this.router.navigate(['/orders/new']);
    } else {
      this.logger.warn('ID de orden no válido', { id }, 'OrderDetail');
      this.feedback.showError('ID de orden no válido');
      this.router.navigate(['/orders']);
    }
  }

  async loadOrder(id: string) {
    try {
      this.loading.set(true);
      const agg = await this.ordersService.loadOrderAggregate(id);
      if (agg) {
        this.rawOrder.set(agg.getSnapshot());
        this.rawItems.set([...agg.items]);
      } else {
        const { order, orderError, items, itemsError } = await this.ordersService.getOrderById(id);
        if (orderError) throw orderError;
        if (!order) {
          this.logger.warn('No se encontró la orden', { id }, 'OrderDetail');
          this.feedback.showError('La orden no existe');
          this.router.navigate(['/orders']);
          return;
        }
        this.rawOrder.set(order);
        if (itemsError) throw itemsError;
        this.rawItems.set(items || []);
      }
    } catch (error: any) {
      this.logger.error('Error loading order', error, 'OrderDetail');
      this.feedback.showError('Error al cargar la orden');
    } finally {
      this.loading.set(false);
    }
  }

  // -------------------------------------------------------------
  // ACCIONES GRANULARES DE LÍNEA DE PRODUCTO (OPTIMISTIC UI)
  // -------------------------------------------------------------

  async onIncrementItem(item: any) {
    const orderId = this.orderIdNumber();
    if (!orderId) return;

    const res = await this.ordersService.adjustItemQuantity(orderId, item.id, {
      delta: 1,
      reason: 'courtesy_modification',
    });

    if (!res.success) {
      this.feedback.showError(res.error || 'No se pudo agregar el producto');
    }
  }

  async onDecrementItem(item: any) {
    const orderId = this.orderIdNumber();
    if (!orderId) return;

    if (item.cantidad > 1) {
      const res = await this.ordersService.adjustItemQuantity(orderId, item.id, {
        delta: -1,
        reason: 'customer_removed',
      });
      if (!res.success) {
        this.feedback.showError(res.error || 'No se pudo decrementar el producto');
      }
    } else {
      // Cantidad es 1: confirmación explícita con motivo justificado para anular
      this.feedback.confirmAndExecute({
        title: '¿Quitar producto?',
        message: `¿Deseas quitar "${item.nombre_producto}" de la orden?`,
        confirmText: 'Quitar producto',
        cancelText: 'Cancelar',
        showInput: true,
        inputPlaceholder: 'Motivo (ej. cliente canceló, error de comanda)...',
        isDanger: true,
        action: async (reason?: string) => {
          const res = await this.ordersService.cancelOrderItem(orderId, item.id, 'customer_removed', reason?.trim());
          if (!res.success) throw new Error(res.error || 'No se pudo quitar el producto');
        },
        successMsg: `Se quitó "${item.nombre_producto}"`,
        errorMsg: 'Error al quitar producto'
      });
    }
  }

  onCancelItem(item: any) {
    const orderId = this.orderIdNumber();
    if (!orderId) return;

    this.feedback.confirmAndExecute({
      title: '¿Anular producto completo?',
      message: `Esta acción anulará las ${item.cantidad} unidades de "${item.nombre_producto}".`,
      confirmText: 'Anular producto',
      cancelText: 'Cancelar',
      showInput: true,
      inputPlaceholder: 'Motivo de la anulación...',
      isDanger: true,
      action: async (reason?: string) => {
        const res = await this.ordersService.cancelOrderItem(orderId, item.id, 'customer_removed', reason?.trim());
        if (!res.success) throw new Error(res.error || 'No se pudo anular el producto');
      },
      successMsg: `Línea de "${item.nombre_producto}" anulada`,
      errorMsg: 'Error al anular producto'
    });
  }

  // -------------------------------------------------------------
  // CAMBIO DINÁMICO DE TIPO DE SERVICIO
  // -------------------------------------------------------------

  async onChangeServiceType(event: ServiceTypeChangeEvent) {
    const orderId = this.orderIdNumber();
    if (!orderId) return;

    try {
      const res = await this.ordersService.changeOrderServiceType(
        orderId,
        event.serviceTypeId,
        event.serviceCode,
        {
          numero_mesa: event.numeroMesa,
          direccion_entrega: event.direccionEntrega,
          newServiceName: event.serviceName,
        }
      );

      if (res.success) {
        this.feedback.showSuccess(`Servicio actualizado a "${event.serviceName}"`);
      } else {
        this.feedback.showError(res.error || 'No se pudo actualizar el servicio');
      }
    } catch (err: any) {
      this.feedback.showError(err?.message || 'Error al cambiar servicio');
    }
  }

  // -------------------------------------------------------------
  // ACCIONES CONTEXTUALES DE ORDEN
  // -------------------------------------------------------------

  async confirmOrder() {
    const id = this.orderIdNumber();
    if (!id) return;

    try {
      await this.ordersService.updateOrderStatus(id, 'confirmado', null);
      await this.loadOrder(String(id));
      this.feedback.showSuccess('Comanda confirmada con éxito');
    } catch (err: any) {
      this.feedback.showError('Error al confirmar comanda');
    }
  }

  async markAsDelivered() {
    const id = this.orderIdNumber();
    if (!id) return;

    this.feedback.confirmAndExecute({
      title: '¿Marcar como entregado?',
      message: 'La comanda pasará a estado entregado y registrará su hora de cierre.',
      confirmText: 'Sí, marcar entregado',
      action: async () => {
        await this.ordersService.updateOrderStatus(id, 'entregado', new Date().toISOString());
        await this.loadOrder(String(id));
      },
      successMsg: 'Comanda marcada como entregada',
      errorMsg: 'Error al actualizar comanda'
    });
  }

  async registerPaymentPrompt() {
    const id = this.orderIdNumber();
    const currentOrder = this.order();
    if (!id || !currentOrder) return;

    const total = currentOrder.total;
    this.feedback.confirmAndExecute({
      title: '¿Registrar cobro?',
      message: `Total a cobrar: $${total.toFixed(2)} MXN`,
      confirmText: 'Cobro recibido',
      cancelText: 'Cancelar',
      action: async () => {
        await this.ordersService.updatePaymentStatus(id, 'pagado');
        await this.loadOrder(String(id));
      },
      successMsg: 'Pago registrado con éxito',
      errorMsg: 'Error al registrar cobro'
    });
  }

  async cancelOrder() {
    const id = this.orderId();
    if (!id) return;

    this.feedback.confirmAndExecute({
      title: '¿Cancelar orden?',
      message: 'Ingresa el motivo de la cancelación. Esta acción cambiará el estado de la orden y no se podrá revertir.',
      confirmText: 'Sí, cancelar orden',
      showInput: true,
      inputPlaceholder: 'Ej. Error de captura, El cliente se retiró...',
      isDanger: true,
      action: async (reason?: string) => {
        const result = await this.ordersService.cancelOrder(Number(id), reason?.trim() || '');
        if (result.success) {
          await this.loadOrder(id);
        } else {
          throw new Error(result.error || 'No se pudo cancelar la orden');
        }
      },
      successMsg: 'Orden cancelada con éxito',
      errorMsg: 'Error al cancelar la orden'
    });
  }

  addMoreProducts() {
    const id = this.orderId();
    if (id) {
      this.ordersService.clearCart();
      this.ordersService.editingOrderId.set(id);
      this.router.navigate(['/orders/new/browse']);
    }
  }

  goBack() {
    this.router.navigate(['/orders']);
  }

  openTicket(type: 'account' | 'kitchen', autoPrint = true) {
    this.ticketType.set(type);
    this.autoPrint.set(autoPrint);
    this.showTicket.set(true);
  }

  async shareTicketPDF() {
    const id = this.orderIdNumber();
    if (!id) return;
    try {
      const data = await this.ticketService.getTicketData(id);
      if (data) {
        await this.ticketService.shareTicketPDF(data);
      } else {
        this.feedback.showError('No se pudieron obtener los datos de la orden');
      }
    } catch (err) {
      this.logger.error('Error sharing PDF', err, 'OrderDetail');
      this.feedback.showError('Error al generar o compartir el PDF');
    }
  }

  async onTicketReady() {
    if (!this.autoPrint()) return;
    const id = this.orderId();
    if (id) {
      const data = await this.ticketService.getTicketData(Number(id));
      if (data) {
        this.ticketService.printTicket(data, this.ticketType());
      }
    }
  }
}
