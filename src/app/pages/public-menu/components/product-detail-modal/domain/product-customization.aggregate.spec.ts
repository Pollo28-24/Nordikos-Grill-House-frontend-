import { Product, Modifier, ModifierCategory } from '@core/models/product.model';
import { ProductCustomization } from './product-customization.aggregate';

describe('ProductCustomization Aggregate Root', () => {
  const dummyProduct: Product = {
    id: '1',
    nombre: 'Burger Nórdika',
    precio: 100,
    price_type: 'variants',
    disponible: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { id: 'v1', producto_id: '1', nombre: 'Chica', precio: 100, disponible: true, created_at: '', updated_at: '' },
      { id: 'v2', producto_id: '1', nombre: 'Grande', precio: 150, disponible: true, created_at: '', updated_at: '' }
    ]
  };

  const radioCategory: ModifierCategory = {
    id: 'cat-termino',
    nombre: 'Término de la carne',
    visible: true,
    tipo_seleccion: 'RADIO',
    min_selections: 1,
    max_selections: 1,
    obligatorio: true,
    orden_visual: 1
  };

  const modTermino1: Modifier = { id: 't1', nombre: 'Medio', precio: 0, visible: true, disponible: true, cantidad_maxima: 1 };
  const modTermino2: Modifier = { id: 't2', nombre: 'Bien Cocido', precio: 0, visible: true, disponible: true, cantidad_maxima: 1 };

  const checkCategory: ModifierCategory = {
    id: 'cat-extras',
    nombre: 'Extras',
    visible: true,
    tipo_seleccion: 'CHECKBOX',
    min_selections: 0,
    max_selections: 2,
    obligatorio: false,
    orden_visual: 2
  };

  const modExtra1: Modifier = { id: 'e1', nombre: 'Tocino', precio: 25, visible: true, disponible: true, cantidad_maxima: 1 };
  const modExtra2: Modifier = { id: 'e2', nombre: 'Queso', precio: 20, visible: true, disponible: true, cantidad_maxima: 1 };
  const modExtra3: Modifier = { id: 'e3', nombre: 'Aguacate', precio: 20, visible: true, disponible: true, cantidad_maxima: 1 };

  it('debe inicializar la primera variante por defecto', () => {
    const aggregate = new ProductCustomization(dummyProduct);
    expect(aggregate.selectedVariant?.id).toBe('v1');
    expect(aggregate.quantity).toBe(1);
  });

  it('RADIO: al seleccionar una nueva opción debe reemplazar la anterior', () => {
    const aggregate = new ProductCustomization(dummyProduct);
    aggregate.selectRadioModifier(radioCategory, modTermino1);
    expect(aggregate.isModifierSelected('cat-termino', 't1')).toBeTrue();

    aggregate.selectRadioModifier(radioCategory, modTermino2);
    expect(aggregate.isModifierSelected('cat-termino', 't1')).toBeFalse();
    expect(aggregate.isModifierSelected('cat-termino', 't2')).toBeTrue();
  });

  it('CHECKBOX: debe respetar el límite de max_selections', () => {
    const aggregate = new ProductCustomization(dummyProduct);
    aggregate.toggleCheckboxModifier(checkCategory, modExtra1);
    aggregate.toggleCheckboxModifier(checkCategory, modExtra2);
    expect(aggregate.getCategorySelectedCount('cat-extras')).toBe(2);

    // Intentar agregar un tercero cuando el máximo es 2
    aggregate.toggleCheckboxModifier(checkCategory, modExtra3);
    expect(aggregate.getCategorySelectedCount('cat-extras')).toBe(2);
    expect(aggregate.isModifierSelected('cat-extras', 'e3')).toBeFalse();
  });

  it('Guardrail 14: debe emitir nuevas referencias de Map al mutar para garantizar reactividad en Signals', () => {
    const aggregate = new ProductCustomization(dummyProduct);
    const initialMap = aggregate.selectedModifiers;
    aggregate.selectRadioModifier(radioCategory, modTermino1);
    const nextMap = aggregate.selectedModifiers;

    expect(initialMap).not.toBe(nextMap);
  });

  it('toCartCustomization debe producir un snapshot inmutable con variant tipado', () => {
    const aggregate = new ProductCustomization(dummyProduct);
    aggregate.selectRadioModifier(radioCategory, modTermino1);
    const pricing = { baseUnitPrice: 100, modifiersUnitPrice: 0, totalUnitPrice: 100, quantity: 1, finalTotal: 100 };
    const snapshot = aggregate.toCartCustomization(pricing);

    expect(snapshot.product.id).toBe('1');
    expect(snapshot.variant?.id).toBe('v1');
    expect(snapshot.modifiers.length).toBe(1);
    expect(snapshot.pricing.finalTotal).toBe(100);
  });
});
