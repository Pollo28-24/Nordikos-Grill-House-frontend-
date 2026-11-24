import { importProvidersFrom, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  Bike,
  LucideAngularModule,
  MapPin,
  Receipt,
  Share2,
  ShoppingBag,
  Utensils,
  X,
} from 'lucide-angular';
import { ClientSubmittedOrder } from '@core/models/order.model';
import { ClientOrdersService } from '@core/services/client-orders.service';
import { OverlayLockService } from '@core/services/overlay-lock.service';
import { PublicOrdersModal } from './public-orders-modal';

describe('PublicOrdersModal (Hallazgo f: track compuesto en modificadores)', () => {
  let fixture: ComponentFixture<PublicOrdersModal>;
  const ordersSignal = signal<ClientSubmittedOrder[]>([]);

  beforeEach(async () => {
    ordersSignal.set([]);

    await TestBed.configureTestingModule({
      imports: [PublicOrdersModal],
      providers: [
        provideZonelessChangeDetection(),
        importProvidersFrom(
          LucideAngularModule.pick({
            Receipt,
            X,
            Utensils,
            Bike,
            ShoppingBag,
            MapPin,
            Share2,
          })
        ),
        {
          provide: ClientOrdersService,
          useValue: {
            orders: ordersSignal.asReadonly(),
            ordersCount: () => ordersSignal().length,
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

    fixture = TestBed.createComponent(PublicOrdersModal);
  });

  it('debe renderizar dos modificadores con el mismo nombre_modificador sin emitir NG0955', () => {
    const warnSpy = spyOn(console, 'warn').and.callThrough();
    const errorSpy = spyOn(console, 'error').and.callThrough();
    const logSpy = spyOn(console, 'log').and.callThrough();

    const orderWithDupMods: ClientSubmittedOrder = {
      request_code: 'REQ-20261121-001',
      created_at: new Date().toISOString(),
      service_name: 'En Mesa',
      service_code: 'mesa',
      total: 155,
      cliente: { nombre: 'Cliente Prueba', telefono: '9510000000', numero_mesa: '4' },
      metodo_pago: 'efectivo',
      items: [
        {
          id: 'item-1',
          product_id: 'p-1',
          nombre: 'Burger Especial',
          precio: 155,
          cantidad: 1,
          modificadores: [
            { modificador_id: 10, nombre_modificador: 'Queso Extra', cantidad: 1, precio_unitario: 15 },
            { modificador_id: 11, nombre_modificador: 'Queso Extra', cantidad: 2, precio_unitario: 20 },
          ],
        },
      ],
    };

    ordersSignal.set([orderWithDupMods]);

    expect(() => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      // Forzar un ciclo de reconciliación en OnPush (ej. llegada/actualización de pedidos)
      ordersSignal.set([
        {
          ...orderWithDupMods,
          items: orderWithDupMods.items.map(it => ({
            ...it,
            modificadores: [...(it.modificadores || [])],
          })),
        },
      ]);
      fixture.detectChanges();
    }).not.toThrow();

    const el = fixture.nativeElement as HTMLElement;
    const modBadges = Array.from(el.querySelectorAll('span')).filter(s =>
      (s.textContent || '').includes('+ Queso Extra')
    );
    expect(modBadges.length).toBe(2);
    expect(modBadges[0].textContent).not.toContain('x2');
    expect(modBadges[1].textContent).toContain('x2');

    const allConsoleArgs = [
      ...warnSpy.calls.allArgs(),
      ...errorSpy.calls.allArgs(),
      ...logSpy.calls.allArgs(),
    ].flat();
    const hasNg0955 = allConsoleArgs.some(arg => String(arg).includes('NG0955'));
    expect(hasNg0955).withContext('No debe emitir NG0955 por track duplicado en modificadores').toBeFalse();
  });
});
