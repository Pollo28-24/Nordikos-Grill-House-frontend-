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
});
