import { Component, ChangeDetectionStrategy, inject, signal, computed, effect, input, output, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OrdersRequestsService } from '@core/services/orders-requests.service';
import { OrdersRequestsApi } from '@core/api/orders-requests.api';
import { ToastService } from '@core/services/toast.service';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { CartItem } from '@core/services/public-cart.service';
import { OrderRequestLocation, CheckoutDraft } from '@core/models/order.model';
import { getGoogleMapsUrl } from '@core/utils/order-location.utils';

export type CheckoutStep = 'service' | 'data' | 'payment' | 'success';
export type ServiceCode = 'mesa' | 'llevar' | 'delivery';

@Component({
  selector: 'app-public-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, CurrencyMxnPipe],
  templateUrl: './public-checkout.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicCheckout implements OnInit {
  private fb = inject(FormBuilder);
  private requestsService = inject(OrdersRequestsService);
  private requestsApi = inject(OrdersRequestsApi);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  private readonly DRAFT_STORAGE_KEY = 'nordikos_checkout_draft';

  // Inputs & Outputs
  isOpen = input<boolean>(false);
  items = input<CartItem[]>([]);
  total = input<number>(0);

  close = output<void>();
  orderSubmitted = output<{ request_code: string }>();

  // State Signals
  step = signal<CheckoutStep>('service');
  serviceTypes = signal<{ id: number; nombre: string }[]>([]);
  selectedServiceId = signal<number | null>(null);
  
  // Geolocation state
  geoStatus = signal<'idle' | 'requesting' | 'success' | 'denied' | 'error'>('idle');
  capturedLocation = signal<OrderRequestLocation | null>(null);
  manualAddressMode = signal<boolean>(false);

  // Submission & Confirmation
  isSubmitting = signal<boolean>(false);
  successRequestCode = signal<string>('');
  submittedTotal = signal<number>(0);
  showOrderSummary = signal<boolean>(false);

  // Selected Service Type derived
  selectedService = computed(() => {
    const id = this.selectedServiceId();
    if (!id) return null;
    return this.serviceTypes().find(t => t.id === id) || null;
  });

  serviceCode = computed<ServiceCode>(() => {
    const s = this.selectedService();
    if (!s) return 'mesa';
    const name = s.nombre.toLowerCase();
    if (name.includes('mesa') || name.includes('comedor')) return 'mesa';
    if (name.includes('domicilio') || name.includes('delivery')) return 'delivery';
    return 'llevar';
  });

  // Single Reactive Form
  checkoutForm = this.fb.nonNullable.group({
    nombre: [''],
    telefono: [''],
    email: [''],
    tipo_servicio_id: [null as number | null, Validators.required],
    numero_mesa: [''],
    direccion: [''],
    referencias: [''],
    nota_general: [''],
    metodo_pago: ['efectivo'], // Extensible para stripe / mercadopago
  });

  constructor() {
    // Escucha cambios del formulario para actualizar automáticamente el borrador en LocalStorage
    if (isPlatformBrowser(this.platformId)) {
      this.checkoutForm.valueChanges.subscribe(() => {
        this.saveDraft();
      });
    }

    // Si el modal se vuelve a abrir y había quedado en pantalla de éxito, reiniciar para un pedido nuevo
    effect(() => {
      if (this.isOpen() && this.step() === 'success') {
        this.resetCheckout();
      }
    });
  }

  ngOnInit() {
    this.loadServiceTypes();
  }

  async loadServiceTypes() {
    try {
      const { data, error } = await this.requestsApi.getServiceTypes();
      if (!error && data) {
        this.serviceTypes.set(data);
        // Si hay borrador guardado en localStorage, lo cargamos
        this.loadDraft();
      }
    } catch {
      this.toastService.show('Error al cargar tipos de servicio', 'error');
    }
  }

  private loadDraft() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const saved = localStorage.getItem(this.DRAFT_STORAGE_KEY);
      if (!saved) {
        // Si no hay borrador, pre-seleccionamos el primer servicio por defecto
        const first = this.serviceTypes()[0];
        if (first) {
          this.selectedServiceId.set(first.id);
          this.checkoutForm.patchValue({ tipo_servicio_id: first.id }, { emitEvent: false });
          this.applyValidators(this.serviceCode());
        }
        return;
      }

      const draft: CheckoutDraft = JSON.parse(saved);
      this.checkoutForm.patchValue({
        nombre: draft.nombre || '',
        telefono: draft.telefono || '',
        email: draft.email || '',
        tipo_servicio_id: draft.tipo_servicio_id || this.serviceTypes()[0]?.id || null,
        numero_mesa: draft.numero_mesa || '',
        direccion: draft.direccion || '',
        referencias: draft.referencias || '',
        nota_general: draft.nota_general || '',
      }, { emitEvent: false });

      if (draft.tipo_servicio_id) {
        this.selectedServiceId.set(draft.tipo_servicio_id);
      }
      if (draft.location) {
        this.capturedLocation.set(draft.location);
        this.geoStatus.set('success');
      }
      if (draft.manualAddressMode !== undefined) {
        this.manualAddressMode.set(draft.manualAddressMode);
      }

      this.applyValidators(this.serviceCode());
    } catch (e) {
      console.warn('No se pudo cargar el borrador del checkout:', e);
    }
  }

  private saveDraft() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const val = this.checkoutForm.getRawValue();
      const draft: CheckoutDraft = {
        nombre: val.nombre,
        telefono: val.telefono,
        email: val.email,
        tipo_servicio_id: this.selectedServiceId(),
        numero_mesa: val.numero_mesa,
        direccion: val.direccion,
        referencias: val.referencias,
        nota_general: val.nota_general,
        location: this.capturedLocation(),
        manualAddressMode: this.manualAddressMode(),
      };
      localStorage.setItem(this.DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Error guardando borrador del checkout:', e);
    }
  }

  private clearDraft() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.removeItem(this.DRAFT_STORAGE_KEY);
    } catch {}
  }

  // --- Selección de Servicio y Configuración de Validadores Dinámicos ---
  selectService(service: { id: number; nombre: string }) {
    this.selectedServiceId.set(service.id);
    this.checkoutForm.patchValue({ tipo_servicio_id: service.id });
    this.applyValidators(this.serviceCode());
    this.saveDraft();
    // Avanzar al paso de datos
    this.step.set('data');
  }

  applyValidators(code: ServiceCode) {
    const f = this.checkoutForm.controls;

    // Reset general de validadores
    f.numero_mesa.clearValidators();
    f.nombre.clearValidators();
    f.telefono.clearValidators();
    f.direccion.clearValidators();

    if (code === 'mesa') {
      f.numero_mesa.setValidators([Validators.required]);
      // Nombre y notas son opcionales en mesa
    } else if (code === 'llevar') {
      f.nombre.setValidators([Validators.required]);
      f.telefono.setValidators([Validators.required, Validators.pattern(/^[0-9+ ]{7,15}$/)]);
    } else if (code === 'delivery') {
      f.nombre.setValidators([Validators.required]);
      f.telefono.setValidators([Validators.required, Validators.pattern(/^[0-9+ ]{7,15}$/)]);
      f.direccion.setValidators([Validators.required]);
    }

    f.numero_mesa.updateValueAndValidity();
    f.nombre.updateValueAndValidity();
    f.telefono.updateValueAndValidity();
    f.direccion.updateValueAndValidity();
  }

  // --- Geolocalización Nativa Resiliente ---
  requestCurrentLocation() {
    if (!isPlatformBrowser(this.platformId) || !('geolocation' in navigator)) {
      this.geoStatus.set('denied');
      this.manualAddressMode.set(true);
      this.toastService.show('Geolocalización no soportada en este dispositivo', 'warning');
      return;
    }

    this.geoStatus.set('requesting');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: OrderRequestLocation = {
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
          accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined,
        };
        this.capturedLocation.set(loc);
        this.geoStatus.set('success');
        this.saveDraft();
        this.toastService.show('Ubicación capturada con éxito', 'success');
      },
      (error) => {
        console.warn('Geolocation error:', error);
        if (error.code === 1) {
          this.geoStatus.set('denied');
        } else {
          this.geoStatus.set('error');
        }
        // Habilitar automáticamente edición manual para que el usuario nunca quede atrapado
        this.manualAddressMode.set(true);
        this.saveDraft();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }

  toggleManualAddress() {
    this.manualAddressMode.update(v => !v);
    this.saveDraft();
  }

  toggleSummary() {
    this.showOrderSummary.update(v => !v);
  }

  // Navegación entre Pasos
  goToStep(target: CheckoutStep) {
    this.step.set(target);
  }

  // --- Envío del Pedido ---
  async submitOrder() {
    const code = this.serviceCode();
    this.applyValidators(code);

    if (this.checkoutForm.invalid) {
      this.checkoutForm.markAllAsTouched();
      
      if (code === 'mesa' && this.checkoutForm.controls.numero_mesa.invalid) {
        this.toastService.show('Por favor ingresa tu número de mesa.', 'error');
        return;
      }
      if ((code === 'llevar' || code === 'delivery') && this.checkoutForm.controls.nombre.invalid) {
        this.toastService.show('Por favor ingresa tu nombre.', 'error');
        return;
      }
      if ((code === 'llevar' || code === 'delivery') && this.checkoutForm.controls.telefono.invalid) {
        this.toastService.show('Por favor ingresa un número de teléfono válido (7 a 15 dígitos).', 'error');
        return;
      }
      if (code === 'delivery' && this.checkoutForm.controls.direccion.invalid) {
        this.toastService.show('Por favor ingresa la dirección de entrega.', 'error');
        return;
      }
      this.toastService.show('Por favor revisa los campos requeridos.', 'error');
      return;
    }

    if (this.items().length === 0) {
      this.toastService.show('El carrito está vacío.', 'error');
      return;
    }

    const val = this.checkoutForm.getRawValue();
    const serviceId = this.selectedServiceId()!;

    try {
      this.isSubmitting.set(true);

      const res = await this.requestsService.submitRequest({
        clientInfo: {
          nombre: val.nombre.trim() || (code === 'mesa' ? 'Mesa ' + val.numero_mesa.trim() : 'Cliente'),
          telefono: val.telefono.trim(),
          email: val.email?.trim() || undefined,
          direccion: code === 'delivery' ? val.direccion.trim() : undefined,
        },
        tipo_servicio_id: serviceId,
        numero_mesa: code === 'mesa' ? val.numero_mesa.trim() : null,
        direccion_entrega: code === 'delivery' ? val.direccion.trim() : null,
        referencias: code === 'delivery' ? val.referencias.trim() : null,
        nota_general: val.nota_general.trim() || null,
        location: code === 'delivery' ? this.capturedLocation() : null,
        items: this.items(),
      });

      if (res.success && res.request_code) {
        this.submittedTotal.set(this.total());
        this.successRequestCode.set(res.request_code);
        this.clearDraft();
        this.orderSubmitted.emit({ request_code: res.request_code });
        this.step.set('success');
      } else {
        this.toastService.show(res.error || 'No se pudo enviar el pedido. Intenta nuevamente.', 'error');
      }
    } catch (err: any) {
      this.toastService.show('Error de conexión al procesar el pedido.', 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Reiniciar estado para permitir un nuevo pedido
  resetCheckout() {
    this.step.set('service');
    this.successRequestCode.set('');
    this.submittedTotal.set(0);
    this.isSubmitting.set(false);
    this.geoStatus.set('idle');
    this.capturedLocation.set(null);
    this.manualAddressMode.set(false);
    this.checkoutForm.reset({
      nombre: '',
      telefono: '',
      email: '',
      tipo_servicio_id: this.serviceTypes()[0]?.id || null,
      numero_mesa: '',
      direccion: '',
      referencias: '',
      nota_general: '',
      metodo_pago: 'efectivo',
    });
    if (this.serviceTypes()[0]) {
      this.selectedServiceId.set(this.serviceTypes()[0].id);
      this.applyValidators(this.serviceCode());
    }
  }

  startNewOrder() {
    this.resetCheckout();
    this.close.emit();
  }

  // Cierre y reanudación
  onClose() {
    if (this.step() === 'success') {
      this.resetCheckout();
    }
    this.close.emit();
  }

  getWhatsAppShareUrl(): string {
    const code = this.successRequestCode();
    const sName = this.selectedService()?.nombre || 'Pedido';
    const amount = this.submittedTotal() > 0 ? this.submittedTotal() : this.total();
    let message = `¡Hola Nórdicos Grill House! Acabo de enviar mi pedido *#${code}* (${sName}) por $${amount.toFixed(2)}. ¿Podrían confirmarme la recepción?`;

    if (this.serviceCode() === 'delivery') {
      const address = this.checkoutForm.get('direccion')?.value?.trim();
      const references = this.checkoutForm.get('referencias')?.value?.trim();
      const loc = this.capturedLocation();
      const mapsUrl = getGoogleMapsUrl(loc, address);

      if (address) {
        message += `\n📍 *Dirección:* ${address}${references ? ' (Ref: ' + references + ')' : ''}`;
      }
      if (mapsUrl) {
        message += `\n🗺️ *Ubicación GPS:* ${mapsUrl}`;
      }
    }

    return `https://wa.me/5219512224034?text=${encodeURIComponent(message)}`;
  }
}
