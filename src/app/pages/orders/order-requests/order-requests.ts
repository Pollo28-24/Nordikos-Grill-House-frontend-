import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';
import { OrdersRequestsService, OrderRequest } from '@core/services/orders-requests.service';
import { ToastService } from '@core/services/toast.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { Navbar } from '@shared/components/navbar/navbar';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { OrderRequestLocation, PaymentMethod } from '@core/models/order.model';
import { parseLocationMetadata, parseOrderMetadata, getGoogleMapsUrl, getDeliveryWhatsAppShareUrl } from '@core/utils/order-location.utils';

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

  // Local UI state
  activeTab = signal<'pending' | 'accepted' | 'rejected'>('pending');
  loadingCatalogs = signal(false);

  // Catalogs for accepting requests
  paymentMethods = signal<PaymentMethod[]>([]);

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
      const pagos = await this.requestsService.getPaymentMethods();
      this.paymentMethods.set(pagos);

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

  // Helper to resolve payment method id from DB column or metadata
  resolvePaymentMethodId(req: OrderRequest): number | null {
    if (req.metodo_pago_id) {
      return req.metodo_pago_id;
    }

    const meta = parseOrderMetadata(req.nota_general);
    const code = (meta.paymentMethod || '').toLowerCase();
    if (!code) return null;

    const methods = this.paymentMethods();
    if (!methods || methods.length === 0) return null;

    if (code.includes('efectivo') || code === 'cash') {
      const match = methods.find(m => m.nombre.toLowerCase().includes('efectivo'));
      return match ? match.id : null;
    }
    if (code.includes('tarjeta') || code.includes('terminal') || code === 'card') {
      const match = methods.find(m => m.nombre.toLowerCase().includes('tarjeta') || m.nombre.toLowerCase().includes('terminal'));
      return match ? match.id : null;
    }
    if (code.includes('transferencia') || code.includes('spei') || code === 'transfer') {
      const match = methods.find(m => m.nombre.toLowerCase().includes('transferencia') || m.nombre.toLowerCase().includes('spei'));
      return match ? match.id : null;
    }

    return null;
  }

  getPaymentMethodLabel(req: OrderRequest): string {
    if (req.metodos_pago?.nombre) {
      return req.metodos_pago.nombre;
    }
    if (req.metodo_pago_id) {
      const match = this.paymentMethods().find(m => m.id === req.metodo_pago_id);
      if (match) return match.nombre;
    }
    const meta = parseOrderMetadata(req.nota_general);
    if (meta.paymentMethod) {
      const p = meta.paymentMethod.toLowerCase();
      if (p.includes('efectivo') || p === 'cash') return 'Efectivo';
      if (p.includes('tarjeta') || p.includes('terminal') || p === 'card') return 'Tarjeta';
      if (p.includes('transferencia') || p.includes('spei') || p === 'transfer') return 'Transferencia';
      return meta.paymentMethod;
    }
    return 'Por definir';
  }

  // Acceptance modal trigger (manual override)
  openAcceptModalManually(req: OrderRequest) {
    this.selectedRequest.set(req);
    const resolvedId = this.resolvePaymentMethodId(req);
    if (resolvedId) {
      this.selectedPaymentMethodId.set(resolvedId);
    } else if (this.paymentMethods().length > 0) {
      this.selectedPaymentMethodId.set(this.paymentMethods()[0].id);
    }
    this.isAcceptModalOpen.set(true);
  }

  // 1-Click Acceptance or fallback to modal
  async triggerAccept(req: OrderRequest) {
    const payId = this.resolvePaymentMethodId(req);

    if (payId) {
      // 1-Click Acceptance: El cliente ya seleccionó método de pago válido
      const res = await this.requestsService.acceptRequest(req.id, payId, null);
      if (res.success) {
        this.toastService.show(`Solicitud ${req.request_code} aceptada y convertida a Orden #${res.numero_orden}`, 'success');
      } else {
        this.toastService.show(res.error || 'Error al aceptar la solicitud', 'error');
      }
      return;
    }

    // Fallback: Si no tiene método de pago detectado (solicitud legacy), abrir modal
    this.openAcceptModalManually(req);
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

  // Location & Note Helpers
  getCleanNote(note: string | null | undefined): string | null {
    return parseLocationMetadata(note).cleanNote;
  }

  getRequestLocation(req: OrderRequest): OrderRequestLocation | null {
    if (req.latitude !== null && req.latitude !== undefined && req.longitude !== null && req.longitude !== undefined) {
      return {
        latitude: Number(req.latitude),
        longitude: Number(req.longitude),
        accuracy: req.accuracy ? Number(req.accuracy) : undefined
      };
    }
    return parseLocationMetadata(req.nota_general).location;
  }

  getRawDeliveryAddress(req: OrderRequest): string | null {
    return req.direccion_entrega || req.clientes?.direccion || null;
  }

  getCleanDeliveryAddress(req: OrderRequest): string | null {
    const raw = this.getRawDeliveryAddress(req);
    if (!raw) return null;
    if (raw.includes('(Ref:')) {
      return raw.replace(/\s*\(Ref:\s*[^)]+\)/i, '').trim();
    }
    return raw;
  }

  getDeliveryReferences(req: OrderRequest): string | null {
    if (req.referencias?.trim()) return req.referencias.trim();
    const raw = this.getRawDeliveryAddress(req);
    if (raw && raw.includes('(Ref:')) {
      const match = raw.match(/\(Ref:\s*([^)]+)\)/i);
      return match ? match[1].trim() : null;
    }
    return null;
  }

  getMapsUrl(req: OrderRequest): string | null {
    const loc = this.getRequestLocation(req);
    return getGoogleMapsUrl(loc, this.getCleanDeliveryAddress(req));
  }

  getDeliveryWhatsAppUrl(req: OrderRequest): string {
    const loc = this.getRequestLocation(req);
    const cleanNote = this.getCleanNote(req.nota_general);
    return getDeliveryWhatsAppShareUrl({
      orderCode: req.request_code,
      clientName: req.clientes?.nombre,
      phone: req.clientes?.telefono,
      address: this.getCleanDeliveryAddress(req),
      references: this.getDeliveryReferences(req),
      location: loc,
      note: cleanNote,
      total: req.total,
    });
  }
}
