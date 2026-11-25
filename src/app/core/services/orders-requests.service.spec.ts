import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { OrdersRequestsService } from './orders-requests.service';
import { OrdersRequestsApi } from '../api/orders-requests.api';
import { LoggerService } from './logger.service';
import { OrdersService } from './orders.service';
import { OrdersApi } from '../api/orders.api';
import { OrderDatabase } from './order-db.service';
import { CartState } from '../state/cart.state';
import { OrdersRepository } from '../repositories/orders.repository';
import { ProductsService } from './products.service';
import { ProductsApi } from '../api/products.api';
import { AuthService } from '@auth/data-access/auth.services';
import { SupabaseStorageService } from './supabase-storage.service';
import { SupabaseService } from '@shared/data-access/supabase.service';

describe('Fase 1 Frontend Contracts (OrdersRequestsService, OrdersService, ProductsService)', () => {
  describe('OrdersRequestsService.submitRequest (RPC create_public_order_request_v1)', () => {
    let service: OrdersRequestsService;
    let apiSpy: jasmine.SpyObj<OrdersRequestsApi>;
    let loggerSpy: jasmine.SpyObj<LoggerService>;

    beforeEach(() => {
      apiSpy = jasmine.createSpyObj<OrdersRequestsApi>('OrdersRequestsApi', [
        'createPublicOrderRequest',
        'getPaymentMethods',
        'getRequestsQuery',
        'acceptOrderRequest',
        'rejectOrderRequest',
        'getServiceTypes',
        'getRealtimeChannel',
        'removeRealtimeChannel'
      ]);
      loggerSpy = jasmine.createSpyObj<LoggerService>('LoggerService', ['info', 'warn', 'error']);

      apiSpy.getPaymentMethods.and.resolveTo({
        data: [
          { id: 4, nombre: 'Efectivo' },
          { id: 5, nombre: 'Tarjeta' },
          { id: 6, nombre: 'Transferencia' }
        ],
        error: null
      } as any);

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          OrdersRequestsService,
          { provide: OrdersRequestsApi, useValue: apiSpy },
          { provide: LoggerService, useValue: loggerSpy },
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });

      service = TestBed.inject(OrdersRequestsService);
    });

    it('debe invocar create_public_order_request_v1 con payload normalizado de PublicCheckout y CustomizationStore', async () => {
      apiSpy.createPublicOrderRequest.and.resolveTo({
        data: {
          status: 'success',
          request_id: 42,
          request_code: 'REQ-20261124-007',
          total: 280.0
        },
        error: null
      } as any);

      const res = await service.submitRequest({
        clientInfo: {
          nombre: '  Carlos Mendoza ',
          telefono: ' 9511234567 ',
          email: ' carlos@test.com ',
          direccion: ' Av. Independencia 100 '
        },
        tipo_servicio_id: 3,
        numero_mesa: null,
        direccion_entrega: ' Av. Independencia 100 ',
        referencias: ' Portón café ',
        nota_general: ' Tocar timbre ',
        metodo_pago: 'transferencia',
        location: { latitude: 17.0654, longitude: -96.7236, accuracy: 12.5 },
        items: [
          {
            product_id: '101',
            nombre: 'Hamburguesa Nórdica Clásica',
            cantidad: 1,
            nota: ' Bien cocida ',
            modificadores: [
              {
                modificador_id: '3',
                nombre_modificador: 'Carne extra',
                cantidad: 1,
                precio_unitario: 20
              }
            ]
          },
          {
            producto_id: 105,
            nombre_producto: 'Alitas a la Parrilla',
            variante: { id: '202', nombre: '12 Piezas', precio: 175 },
            cantidad: 1,
            modifiers: [
              {
                modifierId: 7,
                nombre: 'Tocino',
                cantidad: 2,
                precioUnitario: 15
              }
            ]
          }
        ]
      });

      expect(res.success).toBeTrue();
      expect(res.request_code).toBe('REQ-20261124-007');
      expect(res.request_id).toBe(42);
      expect(res.total).toBe(280.0);

      expect(apiSpy.createPublicOrderRequest).toHaveBeenCalledTimes(1);
      const rpcArg = apiSpy.createPublicOrderRequest.calls.mostRecent().args[0];

      expect(rpcArg.p_client_info).toEqual({
        nombre: 'Carlos Mendoza',
        telefono: '9511234567',
        email: 'carlos@test.com',
        direccion: 'Av. Independencia 100'
      });
      expect(rpcArg.p_tipo_servicio_id).toBe(3);
      expect(rpcArg.p_metodo_pago_id).toBe(6);
      expect(rpcArg.p_direccion_entrega).toBe('Av. Independencia 100');
      expect(rpcArg.p_referencias).toBe('Portón café');
      expect(rpcArg.p_nota_general).toBe('Tocar timbre');
      expect(rpcArg.p_location).toEqual({ latitude: 17.0654, longitude: -96.7236, accuracy: 12.5 });

      expect(rpcArg.p_items.length).toBe(2);
      expect(rpcArg.p_items[0]).toEqual({
        producto_id: 101,
        variante_id: null,
        nombre_producto: 'Hamburguesa Nórdica Clásica',
        cantidad: 1,
        nota: 'Bien cocida',
        modificadores: [
          {
            modificador_id: 3,
            nombre_modificador: 'Carne extra',
            cantidad: 1,
            precio_unitario: 20
          }
        ]
      });
      expect(rpcArg.p_items[1]).toEqual({
        producto_id: 105,
        variante_id: 202,
        nombre_producto: 'Alitas a la Parrilla',
        cantidad: 1,
        nota: null,
        modificadores: [
          {
            modificador_id: 7,
            nombre_modificador: 'Tocino',
            cantidad: 2,
            precio_unitario: 15
          }
        ]
      });
    });

    it('debe traducir códigos de error anti-abuso y disponibilidad del RPC a mensajes claros para el comensal', async () => {
      const cases: Array<{ code: string; expectedSubstring: string }> = [
        { code: 'MAX_ITEMS_EXCEEDED', expectedSubstring: 'límite máximo permitido de 30 productos' },
        { code: 'INVALID_QUANTITY', expectedSubstring: 'entre 1 y 25 unidades' },
        { code: 'INVALID_PHONE', expectedSubstring: 'entre 7 y 15 dígitos' },
        { code: 'PRODUCT_NOT_AVAILABLE', expectedSubstring: 'se acaban de agotar o ya no están disponibles' },
        { code: 'MODIFIER_NOT_AVAILABLE', expectedSubstring: 'opciones adicionales seleccionadas ya no están disponibles' },
        { code: 'MODIFIER_MAX_EXCEEDED', expectedSubstring: 'excede la cantidad máxima permitida' }
      ];

      for (const testCase of cases) {
        apiSpy.createPublicOrderRequest.and.resolveTo({
          data: {
            status: 'error',
            error_code: testCase.code,
            message: 'Raw DB message'
          },
          error: null
        } as any);

        const res = await service.submitRequest({
          tipo_servicio_id: 2,
          items: [{ producto_id: 101, nombre_producto: 'Hamburguesa', cantidad: 1 }]
        });

        expect(res.success).toBeFalse();
        expect(res.error_code).toBe(testCase.code);
        expect(res.error).toContain(testCase.expectedSubstring);
        expect(service.error()).toContain(testCase.expectedSubstring);
      }
    });
  });

  describe('OrdersService.addItemsToOrder (envío de modificador_id)', () => {
    let ordersService: OrdersService;
    let ordersApiSpy: jasmine.SpyObj<OrdersApi>;

    beforeEach(() => {
      ordersApiSpy = jasmine.createSpyObj<OrdersApi>('OrdersApi', [
        'insertOrderItem',
        'insertOrderItemModifiers',
        'getOrderTotal',
        'updateOrderTotalAndNote'
      ]);

      ordersApiSpy.insertOrderItem.and.resolveTo({ data: { id: 555 }, error: null } as any);
      ordersApiSpy.insertOrderItemModifiers.and.resolveTo({ data: null, error: null } as any);
      ordersApiSpy.getOrderTotal.and.resolveTo({ data: { total: 100 }, error: null } as any);
      ordersApiSpy.updateOrderTotalAndNote.and.resolveTo({ data: null, error: null } as any);

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          OrdersService,
          { provide: OrdersApi, useValue: ordersApiSpy },
          { provide: OrdersRepository, useValue: {} },
          { provide: CartState, useValue: {} },
          { provide: OrderDatabase, useValue: jasmine.createSpyObj('OrderDatabase', ['save', 'markSynced', 'getPending', 'markFailed']) },
          { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['info', 'warn', 'error']) },
          { provide: PLATFORM_ID, useValue: 'browser' }
        ]
      });

      ordersService = TestBed.inject(OrdersService);
    });

    it('debe incluir modificador_id en el payload de insertOrderItemModifiers', async () => {
      await ordersService.addItemsToOrder(
        99,
        [
          {
            producto_id: 101,
            nombre_producto: 'Hamburguesa Nórdica Clásica',
            cantidad: 1,
            precio_unitario: 120,
            total: 120,
            nota: null,
            modificadores: [
              { modificador_id: 3, nombre_modificador: 'Carne extra', cantidad: 1, precio_unitario: 20 },
              { id: '7', nombre_modificador: 'Tocino', cantidad: 2, precio_unitario: 15 }
            ]
          }
        ],
        'Nota actualizada',
        0
      );

      expect(ordersApiSpy.insertOrderItemModifiers).toHaveBeenCalledTimes(1);
      const modsArg = ordersApiSpy.insertOrderItemModifiers.calls.mostRecent().args[0];
      expect(modsArg).toEqual([
        {
          order_item_id: 555,
          modificador_id: 3,
          nombre_modificador: 'Carne extra',
          cantidad: 1,
          precio_unitario: 20
        },
        {
          order_item_id: 555,
          modificador_id: 7,
          nombre_modificador: 'Tocino',
          cantidad: 2,
          precio_unitario: 15
        }
      ]);
    });
  });

  describe('ProductsService.update (sin columna inexistente imagen_url)', () => {
    let productsService: ProductsService;
    let productsApiSpy: jasmine.SpyObj<ProductsApi>;

    beforeEach(() => {
      productsApiSpy = jasmine.createSpyObj<ProductsApi>('ProductsApi', [
        'getById',
        'update',
        'insertFotos',
        'deleteFoto',
        'getAll'
      ]);

      productsApiSpy.getById.and.resolveTo({
        data: {
          id: 101,
          nombre: 'Hamburguesa Nórdica Clásica',
          producto_fotos: [{ id: 1, url: 'https://test/old.webp' }],
          producto_variantes: []
        },
        error: null
      } as any);
      productsApiSpy.update.and.resolveTo(null);
      productsApiSpy.getAll.and.resolveTo({ data: [], error: null } as any);

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          ProductsService,
          { provide: ProductsApi, useValue: productsApiSpy },
          { provide: AuthService, useValue: {} },
          { provide: SupabaseStorageService, useValue: {} },
          { provide: SupabaseService, useValue: { client: {} } },
          { provide: LoggerService, useValue: jasmine.createSpyObj('LoggerService', ['info', 'warn', 'error']) },
          { provide: PLATFORM_ID, useValue: 'server' }
        ]
      });

      productsService = TestBed.inject(ProductsService);
    });

    it('no debe incluir imagen_url ni images en el payload enviado a ProductsApi.update()', async () => {
      const ok = await productsService.update('101', {
        nombre: 'Hamburguesa Nórdica Clásica Editada',
        precio: 115,
        price_type: 'simple',
        images: [{ id: 1, url: 'https://test/old.webp' } as any],
        imagen_url: 'https://test/old.webp'
      } as any);

      expect(ok).toBeTrue();
      expect(productsApiSpy.update).toHaveBeenCalledTimes(1);
      const updatePayload = productsApiSpy.update.calls.mostRecent().args[1] as any;
      expect('imagen_url' in updatePayload).toBeFalse();
      expect('images' in updatePayload).toBeFalse();
      expect(updatePayload.nombre).toBe('Hamburguesa Nórdica Clásica Editada');
    });
  });
});
