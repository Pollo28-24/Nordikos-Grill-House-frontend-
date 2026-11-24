import { importProvidersFrom, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Check, ChevronRight, Flame, LucideAngularModule } from 'lucide-angular';
import { Product } from '@core/models/product.model';
import { ProductCard } from './product-card';

describe('ProductCard (Hallazgo c: precio desde PricingEngine)', () => {
  let fixture: ComponentFixture<ProductCard>;

  const baseProduct: Product = {
    id: 'p-1',
    nombre: 'Hamburguesa Nórdika',
    precio: 0,
    price_type: 'variants',
    descuento: 0,
    disponible: true,
    categoria_id: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCard],
      providers: [
        provideZonelessChangeDetection(),
        importProvidersFrom(LucideAngularModule.pick({ Flame, Check, ChevronRight })),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCard);
  });

  it('debe mostrar el precio neto con descuento propio de la variante (coincidiendo con PricingEngine)', () => {
    const productWithVariantDiscount: Product = {
      ...baseProduct,
      variants: [
        {
          id: 'v1',
          producto_id: 'p-1',
          nombre: 'Doble Carne',
          precio: 160,
          descuento: 20,
          disponible: true,
          created_at: '',
          updated_at: '',
        },
      ],
    };

    fixture.componentRef.setInput('product', productWithVariantDiscount);
    fixture.componentRef.setInput('dark', true);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    const delEl = (fixture.nativeElement as HTMLElement).querySelector('del');

    expect(text).toContain('$140.00');
    expect(delEl?.textContent).toContain('$160.00');
  });

  it('debe ignorar variantes agotadas al mostrar el precio en tarjeta', () => {
    const productWithCheapestUnavailable: Product = {
      ...baseProduct,
      variants: [
        {
          id: 'v1',
          producto_id: 'p-1',
          nombre: 'Chica',
          precio: 80,
          descuento: 0,
          disponible: false,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'v2',
          producto_id: 'p-1',
          nombre: 'Grande',
          precio: 120,
          descuento: 0,
          disponible: true,
          created_at: '',
          updated_at: '',
        },
      ],
    };

    fixture.componentRef.setInput('product', productWithCheapestUnavailable);
    fixture.componentRef.setInput('dark', true);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent || '';
    expect(text).toContain('$120.00');
    expect(text).not.toContain('$80.00');
    expect(text).not.toContain('Desde');
  });

  it('debe mostrar el estado visual existente de agotado (overlay y sin botón habilitado) y nunca "$0" cuando todas las variantes están agotadas', () => {
    const productAllVariantsOff: Product = {
      ...baseProduct,
      disponible: true,
      variants: [
        {
          id: 'v1',
          producto_id: 'p-1',
          nombre: 'Chica',
          precio: 100,
          descuento: 0,
          disponible: false,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'v2',
          producto_id: 'p-1',
          nombre: 'Grande',
          precio: 140,
          descuento: 0,
          disponible: false,
          created_at: '',
          updated_at: '',
        },
      ],
    };

    const addSpy = jasmine.createSpy('onAdd');
    fixture.componentInstance.onAdd.subscribe(addSpy);

    fixture.componentRef.setInput('product', productAllVariantsOff);
    fixture.componentRef.setInput('dark', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent || '';
    const overlay = el.querySelector('.z-20');
    const grayscaleContainer = el.querySelector('.grayscale');
    const actionButton = el.querySelector('button');

    expect(overlay?.textContent).toContain('Agotado');
    expect(grayscaleContainer).not.toBeNull();
    expect(!actionButton || actionButton.disabled).toBeTrue();
    expect(text).not.toContain('$0');
    expect(text).not.toContain('$100.00');

    (el.firstElementChild as HTMLElement)?.click();
    expect(addSpy).not.toHaveBeenCalled();
  });

  // Prueba de CARACTERIZACIÓN: fija el comportamiento actual (bug de (d));
  // a invertir/reemplazar cuando se implemente la decisión de (d).
  it('CARACTERIZACIÓN (comportamiento actual, a invertir cuando se implemente (d)): clic en tarjeta y quickAdd emiten onAdd; botón inferior emite onViewDetails', () => {
    const availableProduct: Product = {
      ...baseProduct,
      disponible: true,
      variants: [
        {
          id: 'v1',
          producto_id: 'p-1',
          nombre: 'Normal',
          precio: 120,
          descuento: 0,
          disponible: true,
          created_at: '',
          updated_at: '',
        },
      ],
    };

    const addSpy = jasmine.createSpy('onAdd');
    const detailsSpy = jasmine.createSpy('onViewDetails');
    fixture.componentInstance.onAdd.subscribe(addSpy);
    fixture.componentInstance.onViewDetails.subscribe(detailsSpy);

    fixture.componentRef.setInput('product', availableProduct);
    fixture.componentRef.setInput('dark', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const cardRoot = el.firstElementChild as HTMLElement;
    const actionButton = el.querySelector('button') as HTMLButtonElement;

    // 1. Clic en la tarjeta dispara onAdd (sin abrir detalle)
    cardRoot.click();
    expect(addSpy).toHaveBeenCalledTimes(1);
    expect(addSpy).toHaveBeenCalledWith(availableProduct);
    expect(detailsSpy).not.toHaveBeenCalled();

    // 2. Clic en el botón inferior dispara onViewDetails (sin propagar a onAdd)
    actionButton.click();
    expect(detailsSpy).toHaveBeenCalledTimes(1);
    expect(detailsSpy).toHaveBeenCalledWith(availableProduct);
    expect(addSpy).toHaveBeenCalledTimes(1);

    // 3. quickAdd dispara onAdd (sin abrir detalle)
    const mockEvent = new MouseEvent('click');
    fixture.componentInstance.quickAdd(mockEvent);
    expect(addSpy).toHaveBeenCalledTimes(2);
    expect(detailsSpy).toHaveBeenCalledTimes(1);
  });
});
