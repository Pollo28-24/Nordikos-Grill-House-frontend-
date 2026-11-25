import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideAngularModule,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  MessageSquare,
  Save,
  CheckCircle,
  Loader2,
  XCircle,
  AlertTriangle,
  X,
} from 'lucide-angular';

import { OrdersService } from './orders.service';
import { OrdersApi } from '../api/orders.api';
import { LocalOrder, OrderDatabase } from './order-db.service';
import { CartState } from '../state/cart.state';
import { OrdersRepository } from '../repositories/orders.repository';
import { LoggerService } from './logger.service';
import { ToastService } from './toast.service';
import { ProductsService } from './products.service';
import { OrderCreateDto } from '../models/order.model';
import { translateOrderCreateError } from '../utils/order-error.utils';
import { NewOrderCart } from '../../pages/orders/new-order/cart/cart';

function buildSampleDto(overrides: Partial<OrderCreateDto> = {}): OrderCreateDto {
  return {
    cliente_id: null,
    metodo_pago_id: 4,
    tipo_servicio_id: 1,
    turno_id: null,
    propina: 0,
    nota_general: null,
    client_request_id: 'a1b2c3d4-1111-4444-8888-000000000001',
    items: [
      {
        producto_id: 101,
        nombre_producto: 'Hamburguesa Nórdica Clásica',
        cantidad: 2,
        modificadores: [{ modificador_id: 3, nombre_modificador: 'Carne extra', cantidad: 1 }],
      },
    ],
    ...overrides,
  };
}

describe('Cola offline POS, traduccion de errores RPC y NewOrderCart', () => {
  describe('translateOrderCreateError', () => {
    it('traduce códigos conocidos de orders_create_v1 y provee respaldo genérico', () => {
      expect(translateOrderCreateError('PRODUCT_NOT_AVAILABLE')).toContain('agotados');
      expect(translateOrderCreateError('PAYMENT_METHOD_INVALID')).toContain('método de pago');
      expect(translateOrderCreateError('SERVICE_TYPE_INVALID')).toContain('tipo de servicio');
      expect(translateOrderCreateError('SHIFT_INVALID')).toContain('turno');
      expect(translateOrderCreateError('IDEMPOTENCY_CONFLICT')).toContain('registrada previamente');
      expect(translateOrderCreateError('UNKNOWN_CODE', 'Mensaje respaldo')).toBe('Mensaje respaldo');
      expect(translateOrderCreateError(null)).toContain('error de validación');
    });
  });

  describe('OrderDatabase.getPending()', () => {
    let db: OrderDatabase;
    const createdIds: string[] = [];

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), OrderDatabase],
      });
      db = TestBed.inject(OrderDatabase);
    });

    afterEach(async () => {
      for (const id of createdIds) {
        await db.deleteOrder(id);
      }
      createdIds.length = 0;
    });

    it('solo devuelve órdenes con status === "pending" y excluye "failed" y "synced"', async () => {
      const pendingId = 'test-pending-' + crypto.randomUUID();
      const failedId = 'test-failed-' + crypto.randomUUID();
      const syncedId = 'test-synced-' + crypto.randomUUID();
      createdIds.push(pendingId, failedId, syncedId);

      const dto = buildSampleDto();
      await db.save({ id: pendingId, status: 'pending', payload: { ...dto, client_request_id: pendingId }, createdAt: 100 });
      await db.save({ id: failedId, status: 'pending', payload: { ...dto, client_request_id: failedId }, createdAt: 200 });
      await db.markFailed(failedId, 'Producto agotado');
      await db.save({ id: syncedId, status: 'pending', payload: { ...dto, client_request_id: syncedId }, createdAt: 300 });
      await db.markSynced(syncedId);

      const pending = await db.getPending();
      const returnedIds = pending.map((o) => o.id);

      expect(returnedIds).toContain(pendingId);
      expect(returnedIds).not.toContain(failedId);
      expect(returnedIds).not.toContain(syncedId);
    });
  });

  describe('OrdersService (validation_error online, offline queued, syncQueue)', () => {
    let ordersService: OrdersService;
    let apiSpy: jasmine.SpyObj<OrdersApi>;
    let dbSpy: jasmine.SpyObj<OrderDatabase>;
    let toastSpy: jasmine.SpyObj<ToastService>;
    let loggerSpy: jasmine.SpyObj<LoggerService>;
    let cartStateSpy: jasmine.SpyObj<CartState>;

    beforeEach(() => {
      apiSpy = jasmine.createSpyObj<OrdersApi>('OrdersApi', [
        'rpcCreateOrderV1',
        'insertTicket',
        'updateOrderNote',
      ]);
      dbSpy = jasmine.createSpyObj<OrderDatabase>('OrderDatabase', [
        'save',
        'markSynced',
        'markFailed',
        'getPending',
        'deleteOrder',
      ]);
      toastSpy = jasmine.createSpyObj<ToastService>('ToastService', ['show', 'remove']);
      loggerSpy = jasmine.createSpyObj<LoggerService>('LoggerService', ['info', 'warn', 'error']);
      cartStateSpy = jasmine.createSpyObj<CartState>('CartState', ['clearCart']);

      dbSpy.save.and.resolveTo();
      dbSpy.markSynced.and.resolveTo();
      dbSpy.markFailed.and.resolveTo();
      dbSpy.deleteOrder.and.resolveTo();
      dbSpy.getPending.and.resolveTo([]);
      apiSpy.insertTicket.and.resolveTo({ data: null, error: null } as any);
      apiSpy.updateOrderNote.and.resolveTo({ data: null, error: null } as any);

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          OrdersService,
          { provide: OrdersApi, useValue: apiSpy },
          { provide: OrderDatabase, useValue: dbSpy },
          { provide: ToastService, useValue: toastSpy },
          { provide: LoggerService, useValue: loggerSpy },
          { provide: CartState, useValue: cartStateSpy },
          { provide: OrdersRepository, useValue: {} },
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });

      ordersService = TestBed.inject(OrdersService);
    });

    it('validation_error online: elimina la orden de IndexedDB y devuelve validation_error con error_code', async () => {
      ordersService.isOnline.set(true);
      const dto = buildSampleDto();
      apiSpy.rpcCreateOrderV1.and.resolveTo({
        data: { status: 'validation_error', error_code: 'PRODUCT_NOT_AVAILABLE' },
        error: null,
      } as any);

      const res = await ordersService.createOrder(dto);

      expect(res).toEqual({ status: 'validation_error', error_code: 'PRODUCT_NOT_AVAILABLE' });
      expect(dbSpy.save).toHaveBeenCalledTimes(1);
      expect(dbSpy.deleteOrder).toHaveBeenCalledOnceWith(dto.client_request_id);
      expect(dbSpy.markSynced).not.toHaveBeenCalled();
      expect(apiSpy.insertTicket).not.toHaveBeenCalled();
      expect(cartStateSpy.clearCart).not.toHaveBeenCalled();
      expect(ordersService.error()).toBe(translateOrderCreateError('PRODUCT_NOT_AVAILABLE'));
    });

    it('offline puro: guarda en IndexedDB como pending y devuelve status "queued" (sin order_id: 0)', async () => {
      ordersService.isOnline.set(false);
      const dto = buildSampleDto();

      const res = await ordersService.createOrder(dto);

      expect(res).toEqual({ status: 'queued', client_request_id: dto.client_request_id });
      expect((res as any).status).not.toBe('success');
      expect(dbSpy.save).toHaveBeenCalledWith(
        jasmine.objectContaining({
          id: dto.client_request_id,
          status: 'pending',
          payload: dto,
        })
      );
      expect(apiSpy.rpcCreateOrderV1).not.toHaveBeenCalled();
    });

    it('validation_error durante syncQueue(): marca failed y notifica visiblemente al cajero qué orden y por qué', async () => {
      ordersService.isOnline.set(true);
      const dto = buildSampleDto({ client_request_id: 'deadbeef-2222-4444-8888-000000000002' });
      const pendingOrder: LocalOrder = {
        id: dto.client_request_id,
        status: 'pending',
        payload: dto,
        createdAt: Date.now(),
      };
      dbSpy.getPending.and.resolveTo([pendingOrder]);
      apiSpy.rpcCreateOrderV1.and.resolveTo({
        data: { status: 'validation_error', error_code: 'PRODUCT_NOT_AVAILABLE' },
        error: null,
      } as any);

      await ordersService.syncQueue();

      const expectedReason = translateOrderCreateError('PRODUCT_NOT_AVAILABLE');
      expect(dbSpy.markFailed).toHaveBeenCalledOnceWith(dto.client_request_id, expectedReason);
      expect(dbSpy.markSynced).not.toHaveBeenCalled();
      expect(loggerSpy.error).toHaveBeenCalled();
      expect(toastSpy.show).toHaveBeenCalledTimes(1);
      const [msg, toastType] = toastSpy.show.calls.mostRecent().args;
      expect(toastType).toBe('error');
      expect(msg).toContain('Hamburguesa Nórdica Clásica');
      expect(msg).toContain('deadbeef');
      expect(msg).toContain(expectedReason);
      expect(ordersService.error()).toBe(msg);
    });

    it('reconexión con orden válida: sincroniza vía RPC y marca la orden como synced', async () => {
      const dto = buildSampleDto({
        client_request_id: 'cafebabe-3333-4444-8888-000000000003',
        nota_general: 'Sin cebolla',
      });
      const pendingOrder: LocalOrder = {
        id: dto.client_request_id,
        status: 'pending',
        payload: dto,
        createdAt: Date.now(),
      };

      ordersService.isOnline.set(false);
      dbSpy.getPending.and.resolveTo([pendingOrder]);
      apiSpy.rpcCreateOrderV1.and.resolveTo({
        data: { status: 'success', order_id: 777, total: 260 },
        error: null,
      } as any);

      // Simular evento 'online' del navegador al reconectar
      window.dispatchEvent(new Event('online'));
      await new Promise((r) => setTimeout(r, 20));

      expect(ordersService.isOnline()).toBeTrue();
      expect(apiSpy.rpcCreateOrderV1).toHaveBeenCalledTimes(1);
      expect(apiSpy.updateOrderNote).toHaveBeenCalledOnceWith(777, 'Sin cebolla');
      expect(dbSpy.markSynced).toHaveBeenCalledOnceWith(dto.client_request_id);
      expect(dbSpy.markFailed).not.toHaveBeenCalled();
      expect(toastSpy.show).not.toHaveBeenCalled();
    });
  });

  describe('NewOrderCart (UI de errores RPC y estado queued)', () => {
    let ordersServiceMock: {
      cart: ReturnType<typeof signal<any[]>>;
      creating: ReturnType<typeof signal<boolean>>;
      editingOrderId: ReturnType<typeof signal<number | string | null>>;
      getPaymentMethods: jasmine.Spy;
      getServiceTypes: jasmine.Spy;
      getClients: jasmine.Spy;
      createOrder: jasmine.Spy;
      clearCart: jasmine.Spy;
      getOrderById: jasmine.Spy;
      increment: jasmine.Spy;
      decrement: jasmine.Spy;
      remove: jasmine.Spy;
      addItemsToOrder: jasmine.Spy;
    };
    let toastSpy: jasmine.SpyObj<ToastService>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(async () => {
      ordersServiceMock = {
        cart: signal<any[]>([
          {
            tempId: 'tmp-1',
            producto_id: 101,
            nombre_producto: 'Hamburguesa Nórdica Clásica',
            cantidad: 1,
            modificadores: [],
          },
        ]),
        creating: signal(false),
        editingOrderId: signal<number | string | null>(null),
        getPaymentMethods: jasmine.createSpy('getPaymentMethods').and.resolveTo({
          data: [{ id: 4, nombre: 'Efectivo', tipo: 'cash' }],
          error: null,
        }),
        getServiceTypes: jasmine.createSpy('getServiceTypes').and.resolveTo({
          data: [{ id: 1, nombre: 'Para llevar' }],
          error: null,
        }),
        getClients: jasmine.createSpy('getClients').and.resolveTo({ data: [], error: null }),
        createOrder: jasmine.createSpy('createOrder'),
        clearCart: jasmine.createSpy('clearCart').and.callFake(() => ordersServiceMock.cart.set([])),
        getOrderById: jasmine.createSpy('getOrderById'),
        increment: jasmine.createSpy('increment'),
        decrement: jasmine.createSpy('decrement'),
        remove: jasmine.createSpy('remove'),
        addItemsToOrder: jasmine.createSpy('addItemsToOrder'),
      };
      toastSpy = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
      routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);

      await TestBed.configureTestingModule({
        imports: [
          NewOrderCart,
          LucideAngularModule.pick({
            ShoppingBag,
            Trash2,
            Minus,
            Plus,
            MessageSquare,
            Save,
            CheckCircle,
            Loader2,
            XCircle,
            AlertTriangle,
            X,
          }),
        ],
        providers: [
          provideZonelessChangeDetection(),
          { provide: OrdersService, useValue: ordersServiceMock },
          { provide: ProductsService, useValue: { products: signal([]) } },
          { provide: ToastService, useValue: toastSpy },
          { provide: Router, useValue: routerSpy },
          { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['info', 'warn', 'error']) },
        ],
      }).compileComponents();
    });

    it('validation_error: muestra mensaje traducido en toast y template sin limpiar el carrito ni navegar', async () => {
      const fixture = TestBed.createComponent(NewOrderCart);
      const component = fixture.componentInstance;
      await component.loadCatalogs();
      fixture.detectChanges();

      ordersServiceMock.createOrder.and.resolveTo({
        status: 'validation_error',
        error_code: 'PRODUCT_NOT_AVAILABLE',
      });

      await component.createNewOrder();
      fixture.detectChanges();

      const expectedMsg = translateOrderCreateError('PRODUCT_NOT_AVAILABLE');
      expect(toastSpy.show).toHaveBeenCalledWith(expectedMsg, 'error', 6000);
      expect(ordersServiceMock.clearCart).not.toHaveBeenCalled();
      expect(ordersServiceMock.cart().length).toBe(1);
      expect(routerSpy.navigate).not.toHaveBeenCalled();

      const alertEl: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl).not.toBeNull();
      expect(alertEl?.textContent).toContain(expectedMsg);
    });

    it('estado queued (offline): muestra aviso de orden pendiente sin navegar a /orders/0 ni decir Orden #0 creada', async () => {
      const fixture = TestBed.createComponent(NewOrderCart);
      const component = fixture.componentInstance;
      await component.loadCatalogs();
      fixture.detectChanges();

      ordersServiceMock.createOrder.and.resolveTo({
        status: 'queued',
        client_request_id: 'offline-req-1',
      });

      await component.createNewOrder();
      fixture.detectChanges();

      expect(routerSpy.navigate).not.toHaveBeenCalled();
      expect(toastSpy.show).toHaveBeenCalled();
      const [toastMsg, toastType] = toastSpy.show.calls.mostRecent().args;
      expect(toastType).toBe('warning');
      expect(toastMsg).toContain('guardada sin conexión');
      expect(toastMsg).toContain('pendiente de envío');
      expect(toastMsg).not.toContain('Orden #0');

      const alertEl: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
      expect(alertEl).not.toBeNull();
      expect(alertEl?.textContent).toContain('Orden guardada sin conexión, pendiente de envío');
      expect(ordersServiceMock.clearCart).toHaveBeenCalledTimes(1);
    });

    it('flujo normal online (success): conserva comportamiento de toast y navegación a /orders/:id', async () => {
      const fixture = TestBed.createComponent(NewOrderCart);
      const component = fixture.componentInstance;
      await component.loadCatalogs();
      fixture.detectChanges();

      ordersServiceMock.createOrder.and.resolveTo({
        status: 'success',
        order_id: 321,
        total: 150,
      });

      await component.createNewOrder();
      fixture.detectChanges();

      expect(toastSpy.show).toHaveBeenCalledWith('Orden #321 creada', 'success');
      expect(ordersServiceMock.clearCart).toHaveBeenCalledTimes(1);
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/orders/321']);
    });
  });
});
