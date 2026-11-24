import { importProvidersFrom, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ChevronRight,
  Image,
  Info,
  LucideAngularModule,
  MessageSquare,
  Minus,
  Plus,
  Receipt,
  Send,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-angular';
import { CartItem } from '@core/models/order.model';
import { ClientOrdersService } from '@core/services/client-orders.service';
import { OverlayLockService } from '@core/services/overlay-lock.service';
import { PublicCart } from './public-cart';

describe('PublicCart (Hallazgo e: precio tachado coherente con extras)', () => {
  let fixture: ComponentFixture<PublicCart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicCart],
      providers: [
        provideZonelessChangeDetection(),
        importProvidersFrom(
          LucideAngularModule.pick({
            ShoppingCart,
            X,
            Info,
            Receipt,
            ChevronRight,
            ShoppingBag,
            Image,
            Trash2,
            MessageSquare,
            Minus,
            Plus,
            Send,
          })
        ),
        {
          provide: ClientOrdersService,
          useValue: {
            hasOrders: signal(false),
            ordersCount: signal(0),
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

    fixture = TestBed.createComponent(PublicCart);
  });

  it('2a) ítem actual con descuento y extras: muestra $120.00 y tachado $130.00', () => {
    const itemWithDiscountAndExtras: CartItem = {
      cart_item_id: 'ci-1',
      id: 'ci-1',
      producto_id: 'p-1',
      product_id: 'p-1',
      nombre_producto: 'Hamburguesa Nórdika',
      nombre: 'Hamburguesa Nórdika',
      precio_original: 100,
      descuento: 10,
      precio_base: 90,
      precio_modificadores: 30,
      precio_total_unitario: 120,
      precio_unitario: 120,
      precio: 120,
      cantidad: 1,
      modificadores: [
        { modificador_id: 'm1', nombre_modificador: 'Tocino Extra', cantidad: 1, precio_unitario: 30 },
      ],
    };

    fixture.componentRef.setInput('items', [itemWithDiscountAndExtras]);
    fixture.componentRef.setInput('total', 120);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const delEl = el.querySelector('del');

    expect(el.textContent).toContain('$120.00');
    expect(delEl).withContext('debe renderizar el precio tachado <del>').not.toBeNull();
    expect(delEl?.textContent?.trim()).toBe('$130.00');
  });

  it('2b) ítem actual sin descuento: no renderiza precio tachado', () => {
    const itemWithoutDiscount: CartItem = {
      cart_item_id: 'ci-2',
      id: 'ci-2',
      producto_id: 'p-2',
      product_id: 'p-2',
      nombre_producto: 'Alitas BBQ',
      nombre: 'Alitas BBQ',
      precio_original: 100,
      descuento: 0,
      precio_base: 100,
      precio_modificadores: 20,
      precio_total_unitario: 120,
      precio_unitario: 120,
      precio: 120,
      cantidad: 1,
    };

    fixture.componentRef.setInput('items', [itemWithoutDiscount]);
    fixture.componentRef.setInput('total', 120);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('$120.00');
    expect(el.querySelector('del')).toBeNull();
  });

  it('2c) ítem sin precio_modificadores pero con precio_total_unitario: no lanza ni muestra NaN', () => {
    const itemWithoutModifiersPrice = {
      cart_item_id: 'ci-3',
      id: 'ci-3',
      producto_id: 'p-3',
      product_id: 'p-3',
      nombre_producto: 'Papas Bravas',
      nombre: 'Papas Bravas',
      precio_original: 100,
      descuento: 10,
      precio_base: 90,
      precio_modificadores: undefined,
      precio_total_unitario: 120,
      precio_unitario: 120,
      precio: 120,
      cantidad: 1,
    } as unknown as CartItem;

    expect(() => {
      fixture.componentRef.setInput('items', [itemWithoutModifiersPrice]);
      fixture.componentRef.setInput('total', 120);
      fixture.detectChanges();
    }).not.toThrow();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('$120.00');
    expect(text).not.toContain('NaN');
  });

  it('2d) ítem con precio_original undefined y descuento = 0: no renderiza <del> ni NaN', () => {
    const itemNoOriginalNoDiscount: CartItem = {
      cart_item_id: 'ci-4',
      id: 'ci-4',
      producto_id: 'p-4',
      product_id: 'p-4',
      nombre_producto: 'Limonada',
      nombre: 'Limonada',
      precio_original: undefined,
      descuento: 0,
      precio_base: 45,
      precio_modificadores: 0,
      precio_total_unitario: 45,
      precio_unitario: 45,
      precio: 45,
      cantidad: 1,
    };

    fixture.componentRef.setInput('items', [itemNoOriginalNoDiscount]);
    fixture.componentRef.setInput('total', 45);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent || '';
    expect(el.querySelector('del')).toBeNull();
    expect(text).toContain('$45.00');
    expect(text).not.toContain('NaN');
  });

  it('2e) ítem con precio_original undefined y precio_modificadores > 0: no renderiza <del> ni NaN', () => {
    const itemNoOriginalWithExtras: CartItem = {
      cart_item_id: 'ci-5',
      id: 'ci-5',
      producto_id: 'p-5',
      product_id: 'p-5',
      nombre_producto: 'Burger Clásica',
      nombre: 'Burger Clásica',
      precio_original: undefined,
      descuento: 10,
      precio_base: 90,
      precio_modificadores: 30,
      precio_total_unitario: 120,
      precio_unitario: 120,
      precio: 120,
      cantidad: 1,
      modificadores: [
        { modificador_id: 'm1', nombre_modificador: 'Tocino', cantidad: 1, precio_unitario: 30 },
      ],
    };

    fixture.componentRef.setInput('items', [itemNoOriginalWithExtras]);
    fixture.componentRef.setInput('total', 120);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent || '';
    expect(el.querySelector('del')).toBeNull();
    expect(text).toContain('$120.00');
    expect(text).toContain('$90.00');
    expect(text).not.toContain('NaN');
  });

  describe('Hallazgo (f): modificadores con nombre repetido sin NG0955', () => {
    it('debe renderizar dos modificadores con el mismo nombre_modificador sin emitir NG0955', () => {
      const warnSpy = spyOn(console, 'warn').and.callThrough();
      const errorSpy = spyOn(console, 'error').and.callThrough();
      const logSpy = spyOn(console, 'log').and.callThrough();

      const itemWithDuplicateModNames: CartItem = {
        cart_item_id: 'ci-dup',
        id: 'ci-dup',
        producto_id: 'p-dup',
        product_id: 'p-dup',
        nombre_producto: 'Burger Doble',
        nombre: 'Burger Doble',
        precio_base: 100,
        precio_modificadores: 55,
        precio_total_unitario: 155,
        precio_unitario: 155,
        precio: 155,
        cantidad: 1,
        modificadores: [
          { modificador_id: 10, nombre_modificador: 'Queso Extra', cantidad: 1, precio_unitario: 15 },
          { modificador_id: 11, nombre_modificador: 'Queso Extra', cantidad: 2, precio_unitario: 20 },
        ],
      };

      expect(() => {
        fixture.componentRef.setInput('items', [itemWithDuplicateModNames]);
        fixture.componentRef.setInput('total', 155);
        fixture.detectChanges();
      }).not.toThrow();

      const el = fixture.nativeElement as HTMLElement;
      const modBadges = Array.from(el.querySelectorAll('span')).filter(s =>
        (s.textContent || '').includes('+ Queso Extra')
      );
      expect(modBadges.length).toBe(2);
      expect(modBadges[0].textContent).toContain('$15.00');
      expect(modBadges[1].textContent).toContain('x2');
      expect(modBadges[1].textContent).toContain('$40.00');

      const allConsoleArgs = [
        ...warnSpy.calls.allArgs(),
        ...errorSpy.calls.allArgs(),
        ...logSpy.calls.allArgs(),
      ].flat();
      const hasNg0955 = allConsoleArgs.some(arg => String(arg).includes('NG0955'));
      expect(hasNg0955).withContext('No debe emitir NG0955 por track duplicado en modificadores').toBeFalse();
    });
  });
});
