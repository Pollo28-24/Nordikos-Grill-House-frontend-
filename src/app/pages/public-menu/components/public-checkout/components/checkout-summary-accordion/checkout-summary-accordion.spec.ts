import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChevronDown, ChevronUp, LucideAngularModule } from 'lucide-angular';
import { CartItem } from '@core/models/order.model';
import { CheckoutSummaryAccordionComponent } from './checkout-summary-accordion';

describe('CheckoutSummaryAccordionComponent (Hallazgo f: track compuesto en modificadores)', () => {
  let fixture: ComponentFixture<CheckoutSummaryAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CheckoutSummaryAccordionComponent],
      providers: [
        provideZonelessChangeDetection(),
        importProvidersFrom(LucideAngularModule.pick({ ChevronUp, ChevronDown })),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckoutSummaryAccordionComponent);
  });

  it('debe renderizar dos modificadores con el mismo nombre_modificador sin emitir NG0955', () => {
    const warnSpy = spyOn(console, 'warn').and.callThrough();
    const errorSpy = spyOn(console, 'error').and.callThrough();
    const logSpy = spyOn(console, 'log').and.callThrough();

    const itemWithDuplicateModNames: CartItem = {
      cart_item_id: 'ci-1',
      id: 'ci-1',
      producto_id: 'p-1',
      product_id: 'p-1',
      nombre_producto: 'Burger Especial',
      nombre: 'Burger Especial',
      precio_base: 100,
      precio_modificadores: 40,
      precio_total_unitario: 140,
      precio_unitario: 140,
      precio: 140,
      cantidad: 1,
      modificadores: [
        { modificador_id: 10, nombre_modificador: 'Queso Extra', cantidad: 1, precio_unitario: 15 },
        { modificador_id: 11, nombre_modificador: 'Queso Extra', cantidad: 2, precio_unitario: 25 },
      ],
    };

    expect(() => {
      fixture.componentRef.setInput('items', [itemWithDuplicateModNames]);
      fixture.componentRef.setInput('total', 140);
      fixture.componentRef.setInput('isExpanded', true);
      fixture.detectChanges();
    }).not.toThrow();

    const el = fixture.nativeElement as HTMLElement;
    const modBadges = Array.from(el.querySelectorAll('span')).filter(s =>
      (s.textContent || '').includes('+Queso Extra')
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
