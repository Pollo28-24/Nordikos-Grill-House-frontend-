import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Product, ProductVariant } from '@core/models/product.model';
import { PublicCartService } from './public-cart.service';

describe('PublicCartService (Hallazgo e: protección de basePrice con Math.max(0, ...))', () => {
  let service: PublicCartService;

  const productOverDiscounted: Product = {
    id: 'p-1',
    nombre: 'Promo Especial',
    precio: 50,
    descuento: 80,
    price_type: 'simple',
    disponible: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const variantOverDiscounted: ProductVariant = {
    id: 'v-1',
    producto_id: 'p-1',
    nombre: 'Grande',
    precio: 60,
    descuento: 100,
    disponible: true,
    created_at: '',
    updated_at: '',
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        PublicCartService,
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    service = TestBed.inject(PublicCartService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('addToCart debe proteger basePrice con Math.max(0, ...) cuando descuento > precio (producto simple)', () => {
    service.addToCart(productOverDiscounted, undefined, 1);

    const [item] = service.items();
    expect(item.precio_base).toBe(0);
    expect(item.precio_total_unitario).toBe(0);
    expect(service.totalAmount()).toBe(0);
  });

  it('addToCart debe proteger basePrice con Math.max(0, ...) cuando descuento > precio (variante)', () => {
    service.addToCart(productOverDiscounted, variantOverDiscounted, 1);

    const [item] = service.items();
    expect(item.precio_base).toBe(0);
    expect(item.precio_total_unitario).toBe(0);
    expect(service.totalAmount()).toBe(0);
  });

  it('addCustomizedProduct debe proteger basePrice con Math.max(0, ...) y sumar extras sin restar saldo negativo', () => {
    service.addCustomizedProduct({
      product: productOverDiscounted,
      variant: variantOverDiscounted,
      quantity: 1,
      modifiers: [
        {
          modifierId: 'm-1',
          categoryId: 'c-1',
          nombre: 'Queso Extra',
          cantidad: 1,
          precioUnitario: 20,
          subtotal: 20,
          modifier: {
            id: 'm-1',
            nombre: 'Queso Extra',
            precio: 20,
            visible: true,
            disponible: true,
            cantidad_maxima: 5,
          },
        },
      ],
    });

    const [item] = service.items();
    expect(item.precio_base).toBe(0);
    expect(item.precio_modificadores).toBe(20);
    expect(item.precio_total_unitario).toBe(20);
    expect(service.totalAmount()).toBe(20);
  });

  describe('Hallazgo (h): versionado de carrito en localStorage y descarte de formatos desconocidos/corruptos', () => {
    const STORAGE_KEY = 'nordikos_public_cart';

    it('debe persistir el carrito con envoltura versionada { version: 2, items }', () => {
      const simpleProduct: Product = {
        ...productOverDiscounted,
        precio: 100,
        descuento: 10,
      };
      service.addToCart(simpleProduct, undefined, 2);
      TestBed.flushEffects();

      const raw = localStorage.getItem(STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.version).toBe(2);
      expect(Array.isArray(parsed.items)).toBeTrue();
      expect(parsed.items.length).toBe(1);
      expect(parsed.items[0].precio_base).toBe(90);
      expect(parsed.items[0].cantidad).toBe(2);
    });

    it('debe restaurar un carrito válido en formato { version: 2, items } preservando precios y extras', () => {
      const validEnvelope = {
        version: 2,
        items: [
          {
            cart_item_id: 'ci-v2-1',
            id: 'ci-v2-1',
            producto_id: 'p-1',
            product_id: 'p-1',
            nombre_producto: 'Burger V2',
            nombre: 'Burger V2',
            precio_base: 90,
            precio_modificadores: 30,
            precio_total_unitario: 120,
            precio_unitario: 120,
            precio: 120,
            precio_original: 100,
            descuento: 10,
            cantidad: 2,
            modificadores: [
              { modificador_id: 'm1', nombre_modificador: 'Tocino', cantidad: 1, precio_unitario: 30 },
            ],
          },
        ],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(validEnvelope));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          PublicCartService,
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });

      const freshService = TestBed.inject(PublicCartService);
      expect(freshService.items().length).toBe(1);
      expect(freshService.items()[0].precio_total_unitario).toBe(120);
      expect(freshService.totalAmount()).toBe(240);
    });

    it('debe descartar un carrito en formato antiguo sin versión (arreglo plano legacy) en lugar de reconstruir precios', () => {
      const legacyArray = [
        {
          id: 'old-1',
          product_id: 'p-1',
          nombre: 'Burger Legacy',
          precio: 80,
          precio_original: 100,
          descuento: 20,
          cantidad: 1,
        },
      ];

      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyArray));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          PublicCartService,
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });

      const freshService = TestBed.inject(PublicCartService);
      expect(freshService.items()).toEqual([]);
      expect(freshService.totalAmount()).toBe(0);
    });

    it('debe descartar versiones desconocidas y JSON corrupto sin lanzar excepciones', () => {
      for (const badPayload of [
        JSON.stringify({ version: 1, items: [{ id: 'x' }] }),
        JSON.stringify({ version: 99, items: [{ id: 'x' }] }),
        '{json-invalido',
        'null',
      ]) {
        localStorage.setItem(STORAGE_KEY, badPayload);
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          providers: [
            provideZonelessChangeDetection(),
            PublicCartService,
            { provide: PLATFORM_ID, useValue: 'browser' },
          ],
        });

        let freshService!: PublicCartService;
        expect(() => {
          freshService = TestBed.inject(PublicCartService);
        }).not.toThrow();
        expect(freshService.items()).toEqual([]);
        expect(freshService.totalAmount()).toBe(0);
      }
    });

    it('dentro de un sobre v2 válido debe descartar ítems corruptos (NaN o sin precios) conservando los válidos', () => {
      const mixedEnvelope = {
        version: 2,
        items: [
          {
            cart_item_id: 'ci-ok',
            id: 'ci-ok',
            producto_id: 'p-1',
            product_id: 'p-1',
            nombre_producto: 'Válido',
            nombre: 'Válido',
            precio_base: 50,
            precio_modificadores: 0,
            precio_total_unitario: 50,
            precio_unitario: 50,
            precio: 50,
            cantidad: 1,
          },
          {
            cart_item_id: 'ci-corrupt',
            producto_id: 'p-2',
            nombre_producto: 'Corrupto',
            precio_base: 'no-es-numero',
            precio_modificadores: 0,
            precio_total_unitario: null,
            cantidad: 1,
          },
        ],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(mixedEnvelope));
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          PublicCartService,
          { provide: PLATFORM_ID, useValue: 'browser' },
        ],
      });

      const freshService = TestBed.inject(PublicCartService);
      expect(freshService.items().length).toBe(1);
      expect(freshService.items()[0].cart_item_id).toBe('ci-ok');
      expect(freshService.totalAmount()).toBe(50);
    });
  });
});
