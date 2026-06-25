import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { OrdersRequestsService, OrderRequest } from '@core/services/orders-requests.service';
import { ToastService } from '@core/services/toast.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { Navbar } from '@shared/components/navbar/navbar';
import { SupabaseService } from '@shared/data-access/supabase.service';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';

@Component({
  selector: 'app-order-requests-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Navbar, CurrencyMxnPipe, RouterLink],
  templateUrl: './order-requests.html'
})
export class OrderRequestsPage implements OnInit, OnDestroy {
  public requestsService = inject(OrdersRequestsService);
  private toastService = inject(ToastService);
  private feedback = inject(UserFeedbackService);
  private supabase = inject(SupabaseService).client;

  // Local UI state
  activeTab = signal<'pending' | 'accepted' | 'rejected'>('pending');
  loadingCatalogs = signal(false);

  // Catalogs for accepting requests
  paymentMethods = signal<any[]>([]);

  // Modals state
  isAcceptModalOpen = signal(false);
  isRejectModalOpen = signal(false);
  
  selectedRequest = signal<OrderRequest | null>(null);
  
  // Accept form state
  selectedPaymentMethodId = signal<number | null>(null);
  
  // Reject form state
  rejectReason = signal('');
  rejectReasonsList = [
    'Fuera de horario de servicio',
    'Sin stock de productos solicitados',
    'Mesa inexistente o inválida',
    'Solicitud duplicada',
    'Datos de contacto incorrectos/falsos',
    'Otro motivo'
  ];

  // Filtered requests list based on active tab
  filteredRequests = computed(() => {
    const tab = this.activeTab();
    return this.requestsService.allRequests().filter(r => r.estado === tab);
  });

  ngOnInit() {
    this.requestsService.loadRequests();
    this.requestsService.subscribeRealtime();
    this.loadCatalogs();
  }

  ngOnDestroy() {
    this.requestsService.unsubscribeRealtime();
  }

  async loadCatalogs() {
    try {
      this.loadingCatalogs.set(true);
      const { data: pagos } = await this.supabase
        .from('metodos_pago')
        .select('id, nombre')
        .order('id');

      this.paymentMethods.set(pagos ?? []);

      if (pagos && pagos.length > 0) {
        this.selectedPaymentMethodId.set(pagos[0].id);
      }
    } catch (err) {
      this.toastService.show('Error al cargar métodos de pago', 'error');
    } finally {
      this.loadingCatalogs.set(false);
    }
  }

  setTab(tab: 'pending' | 'accepted' | 'rejected') {
    this.activeTab.set(tab);
  }

  refresh() {
    this.requestsService.loadRequests();
  }

  // Acceptance modal trigger
  triggerAccept(req: OrderRequest) {
    this.selectedRequest.set(req);
    this.isAcceptModalOpen.set(true);
  }

  closeAcceptModal() {
    this.isAcceptModalOpen.set(false);
    this.selectedRequest.set(null);
  }

  // Acceptance submission
  async confirmAccept() {
    const req = this.selectedRequest();
    const payId = this.selectedPaymentMethodId();

    if (!req || !payId) {
      this.toastService.show('Datos incompletos para confirmar la aceptación', 'error');
      return;
    }

    const res = await this.requestsService.acceptRequest(req.id, payId, null);
    if (res.success) {
      this.toastService.show(`Solicitud ${req.request_code} aceptada y convertida a Orden #${res.numero_orden}`, 'success');
      this.closeAcceptModal();
    } else {
      this.toastService.show(res.error || 'Error al aceptar la solicitud', 'error');
    }
  }

  // Rejection modal trigger
  triggerReject(req: OrderRequest) {
    this.selectedRequest.set(req);
    this.rejectReason.set('');
    this.isRejectModalOpen.set(true);
  }

  closeRejectModal() {
    this.isRejectModalOpen.set(false);
    this.selectedRequest.set(null);
  }

  selectQuickRejectReason(reason: string) {
    if (reason === 'Otro motivo') {
      this.rejectReason.set('');
    } else {
      this.rejectReason.set(reason);
    }
  }

  // Rejection submission
  async confirmReject() {
    const req = this.selectedRequest();
    const reason = this.rejectReason().trim();

    if (!req || !reason) {
      this.toastService.show('Por favor ingresa o selecciona el motivo de rechazo.', 'error');
      return;
    }

    const res = await this.requestsService.rejectRequest(req.id, reason);
    if (res.success) {
      this.toastService.show(`Solicitud ${req.request_code} rechazada`, 'success');
      this.closeRejectModal();
    } else {
      this.toastService.show(res.error || 'Error al rechazar la solicitud', 'error');
    }
  }

  // Helper formatting methods
  getElapsedTime(createdAtStr: string): string {
    const created = new Date(createdAtStr).getTime();
    const now = new Date().getTime();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins === 1) return 'Hace 1 min';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `Hace ${diffHours} h`;
  }
}
