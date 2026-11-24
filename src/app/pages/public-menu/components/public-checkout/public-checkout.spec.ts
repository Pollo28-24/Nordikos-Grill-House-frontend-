import { PLATFORM_ID, importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AlertCircle,
  Banknote,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  Info,
  Loader,
  LucideAngularModule,
  Mail,
  MapPin,
  Navigation,
  Phone,
  PlusCircle,
  Receipt,
  Send,
  Share2,
  ShoppingBag,
  Smartphone,
  User,
  Utensils,
  X,
} from 'lucide-angular';
import { CartItem } from '@core/models/order.model';
import { OrdersRequestsApi } from '@core/api/orders-requests.api';
import { OrdersRequestsService } from '@core/services/orders-requests.service';
import { ClientOrdersService } from '@core/services/client-orders.service';
import { OverlayLockService } from '@core/services/overlay-lock.service';
import { ToastService } from '@core/services/toast.service';
import { PublicCheckout } from './public-checkout';

describe('PublicCheckout (Hallazgo b: regla B3 entrega a domicilio con GPS + referencias)', () => {
  let fixture: ComponentFixture<PublicCheckout>;
  let component: PublicCheckout;
  let requestsServiceMock: { submitRequest: jasmine.Spy };
  let toastServiceMock: { show: jasmine.Spy };

  const dummyCartItems: CartItem[] = [
    {
      cart_item_id: 'ci-1',
      id: 'ci-1',
      producto_id: 'p-1',
      product_id: 'p-1',
      nombre_producto: 'Hamburguesa Nórdika',
      nombre: 'Hamburguesa Nórdika',
      precio_base: 120,
      precio_modificadores: 0,
      precio_total_unitario: 120,
      precio_unitario: 120,
      precio: 120,
      cantidad: 1,
    },
  ];

  const deliveryService = { id: 3, nombre: 'A Domicilio' };

  beforeEach(async () => {
    localStorage.clear();

    requestsServiceMock = {
      submitRequest: jasmine.createSpy('submitRequest').and.resolveTo({
        success: true,
        request_code: 'REQ-20261124-001',
      }),
    };

    toastServiceMock = {
      show: jasmine.createSpy('show'),
    };

    await TestBed.configureTestingModule({
      imports: [PublicCheckout],
      providers: [
        provideZonelessChangeDetection(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        importProvidersFrom(
          LucideAngularModule.pick({
            AlertCircle,
            Banknote,
            Bike,
            Check,
            CheckCircle2,
            ChevronDown,
            ChevronLeft,
            ChevronRight,
            ChevronUp,
            Clock,
            CreditCard,
            DollarSign,
            ExternalLink,
            Info,
            Loader,
            Mail,
            MapPin,
            Navigation,
            Phone,
            PlusCircle,
            Receipt,
            Send,
            Share2,
            ShoppingBag,
            Smartphone,
            User,
            Utensils,
            X,
          })
        ),
        { provide: OrdersRequestsService, useValue: requestsServiceMock },
        {
          provide: OrdersRequestsApi,
          useValue: {
            getServiceTypes: jasmine.createSpy('getServiceTypes').and.resolveTo({
              data: [
                { id: 1, nombre: 'Comedor / Mesa' },
                { id: 2, nombre: 'Para Llevar' },
                deliveryService,
              ],
              error: null,
            }),
          },
        },
        { provide: ToastService, useValue: toastServiceMock },
        {
          provide: ClientOrdersService,
          useValue: {
            getCustomerProfile: () => null,
            saveCustomerProfile: jasmine.createSpy('saveCustomerProfile'),
            addOrder: jasmine.createSpy('addOrder'),
            getWhatsAppShareUrl: () => 'https://wa.me/5219512224034?text=ok',
          },
        },
        {
          provide: OverlayLockService,
          useValue: {
            lock: jasmine.createSpy('lock'),
            unlock: jasmine.createSpy('unlock'),
            isLocked: () => false,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicCheckout);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('items', dummyCartItems);
    fixture.componentRef.setInput('total', 120);

    component.serviceTypes.set([
      { id: 1, nombre: 'Comedor / Mesa' },
      { id: 2, nombre: 'Para Llevar' },
      deliveryService,
    ]);
    component.selectService(deliveryService);
    component.checkoutForm.patchValue({
      nombre: 'Carlos Mendoza',
      telefono: '9511234567',
      direccion: '',
      referencias: '',
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('B3: con GPS capturado pero SIN dirección escrita ni referencias debe bloquear en goToPaymentStep y submitOrder', async () => {
    component.capturedLocation.set({ latitude: 17.0654, longitude: -96.7236, accuracy: 12 });
    component.geoStatus.set('success');

    component.goToPaymentStep();
    expect(component.step()).toBe('data');
    expect(component.checkoutForm.controls.referencias.invalid).toBeTrue();
    expect(toastServiceMock.show).toHaveBeenCalled();

    await component.submitOrder();
    expect(requestsServiceMock.submitRequest).not.toHaveBeenCalled();
  });

  it('B3: con GPS capturado + referencias (SIN dirección escrita) debe avanzar a pago y permitir enviar el pedido', async () => {
    component.capturedLocation.set({ latitude: 17.0654, longitude: -96.7236, accuracy: 12 });
    component.geoStatus.set('success');
    component.checkoutForm.patchValue({
      direccion: '',
      referencias: 'Portón negro frente a la papelería',
    });

    component.goToPaymentStep();
    expect(component.step()).toBe('payment');
    expect(component.checkoutForm.valid).toBeTrue();

    await component.submitOrder();
    expect(requestsServiceMock.submitRequest).toHaveBeenCalledTimes(1);
    const payload = requestsServiceMock.submitRequest.calls.mostRecent().args[0];
    expect(payload.location).toEqual({ latitude: 17.0654, longitude: -96.7236, accuracy: 12 });
    expect(payload.referencias).toBe('Portón negro frente a la papelería');
  });

  it('B3: con dirección escrita (SIN GPS y sin referencias) debe avanzar a pago y permitir enviar el pedido', async () => {
    component.capturedLocation.set(null);
    component.geoStatus.set('idle');
    component.checkoutForm.patchValue({
      direccion: 'Av. Juárez 412, Centro',
      referencias: '',
    });

    component.goToPaymentStep();
    expect(component.step()).toBe('payment');
    expect(component.checkoutForm.valid).toBeTrue();

    await component.submitOrder();
    expect(requestsServiceMock.submitRequest).toHaveBeenCalledTimes(1);
    const payload = requestsServiceMock.submitRequest.calls.mostRecent().args[0];
    expect(payload.direccion_entrega).toBe('Av. Juárez 412, Centro');
  });

  it('B3: sin GPS y sin dirección escrita debe bloquear marcando direccion como inválida', async () => {
    component.capturedLocation.set(null);
    component.geoStatus.set('idle');
    component.checkoutForm.patchValue({
      direccion: '   ',
      referencias: 'Casa azul',
    });

    component.goToPaymentStep();
    expect(component.step()).toBe('data');
    expect(component.checkoutForm.controls.direccion.invalid).toBeTrue();

    await component.submitOrder();
    expect(requestsServiceMock.submitRequest).not.toHaveBeenCalled();
  });
});
