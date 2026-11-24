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

  describe('Hallazgo (a): variantes y modificadores agotados u ocultos', () => {
    it('debe preseleccionar la primera variante disponible cuando variants[0] está agotada', () => {
      const productWithFirstUnavailable: Product = {
        ...dummyProduct,
        variants: [
          { id: 'v1', producto_id: '1', nombre: 'Chica', precio: 100, disponible: false, created_at: '', updated_at: '' },
          { id: 'v2', producto_id: '1', nombre: 'Grande', precio: 150, disponible: true, created_at: '', updated_at: '' }
        ]
      };

      const aggregate = new ProductCustomization(productWithFirstUnavailable);
      expect(aggregate.selectedVariant?.id).toBe('v2');
    });

    it('debe dejar selectedVariant en null cuando todas las variantes están agotadas', () => {
      const productAllUnavailable: Product = {
        ...dummyProduct,
        variants: [
          { id: 'v1', producto_id: '1', nombre: 'Chica', precio: 100, disponible: false, created_at: '', updated_at: '' },
          { id: 'v2', producto_id: '1', nombre: 'Grande', precio: 150, disponible: false, created_at: '', updated_at: '' }
        ]
      };

      const aggregate = new ProductCustomization(productAllUnavailable);
      expect(aggregate.selectedVariant).toBeNull();
    });

    it('selectVariant debe rechazar una variante con disponible: false', () => {
      const aggregate = new ProductCustomization(dummyProduct);
      const unavailableVariant = {
        id: 'v-off',
        producto_id: '1',
        nombre: 'Agotada',
        precio: 180,
        disponible: false,
        created_at: '',
        updated_at: ''
      };

      aggregate.selectVariant(unavailableVariant);
      expect(aggregate.selectedVariant?.id).toBe('v1');
    });

    it('constructor no debe preseleccionar un modificador RADIO obligatorio agotado u oculto', () => {
      const modAgotado: Modifier = {
        id: 't-off',
        nombre: 'Azul',
        precio: 0,
        visible: true,
        disponible: false,
        cantidad_maxima: 1,
        modificador_categorias: radioCategory
      };
      const modOculto: Modifier = {
        id: 't-hidden',
        nombre: 'Interno',
        precio: 0,
        visible: false,
        disponible: true,
        cantidad_maxima: 1,
        modificador_categorias: radioCategory
      };
      const modDisponible: Modifier = {
        id: 't-ok',
        nombre: 'Término Medio',
        precio: 0,
        visible: true,
        disponible: true,
        cantidad_maxima: 1,
        modificador_categorias: radioCategory
      };

      const productWithMods: Product = {
        ...dummyProduct,
        modifiers: [modAgotado, modOculto, modDisponible]
      };

      const aggregate = new ProductCustomization(productWithMods);
      expect(aggregate.isModifierSelected('cat-termino', 't-off')).toBeFalse();
      expect(aggregate.isModifierSelected('cat-termino', 't-hidden')).toBeFalse();
      expect(aggregate.isModifierSelected('cat-termino', 't-ok')).toBeTrue();

      const productAllModsUnavailable: Product = {
        ...dummyProduct,
        modifiers: [modAgotado, modOculto]
      };
      const aggregateNone = new ProductCustomization(productAllModsUnavailable);
      expect(aggregateNone.getCategorySelectedCount('cat-termino')).toBe(0);
    });

    it('selectRadioModifier debe rechazar modificadores agotados u ocultos', () => {
      const unavailableMod: Modifier = {
        id: 'm-off',
        nombre: 'Agotado',
        precio: 20,
        visible: true,
        disponible: false,
        cantidad_maxima: 3
      };
      const hiddenMod: Modifier = {
        id: 'm-hidden',
        nombre: 'Oculto',
        precio: 15,
        visible: false,
        disponible: true,
        cantidad_maxima: 3
      };

      const aggregate = new ProductCustomization(dummyProduct);

      aggregate.selectRadioModifier(radioCategory, unavailableMod);
      aggregate.selectRadioModifier(radioCategory, hiddenMod);
      expect(aggregate.getCategorySelectedCount('cat-termino')).toBe(0);
    });

    it('toggleCheckboxModifier debe rechazar modificadores agotados u ocultos', () => {
      const unavailableMod: Modifier = {
        id: 'm-off',
        nombre: 'Agotado',
        precio: 20,
        visible: true,
        disponible: false,
        cantidad_maxima: 3
      };
      const hiddenMod: Modifier = {
        id: 'm-hidden',
        nombre: 'Oculto',
        precio: 15,
        visible: false,
        disponible: true,
        cantidad_maxima: 3
      };

      const aggregate = new ProductCustomization(dummyProduct);

      aggregate.toggleCheckboxModifier(checkCategory, unavailableMod);
      aggregate.toggleCheckboxModifier(checkCategory, hiddenMod);
      expect(aggregate.getCategorySelectedCount('cat-extras')).toBe(0);
    });

    it('updateStepperModifier debe rechazar modificadores agotados u ocultos', () => {
      const stepperCategory: ModifierCategory = {
        id: 'cat-stepper',
        nombre: 'Porciones',
        visible: true,
        tipo_seleccion: 'STEPPER',
        min_selections: 0,
        max_selections: 5,
        obligatorio: false,
        orden_visual: 3
      };
      const unavailableMod: Modifier = {
        id: 'm-off',
        nombre: 'Agotado',
        precio: 20,
        visible: true,
        disponible: false,
        cantidad_maxima: 3
      };
      const hiddenMod: Modifier = {
        id: 'm-hidden',
        nombre: 'Oculto',
        precio: 15,
        visible: false,
        disponible: true,
        cantidad_maxima: 3
      };

      const aggregate = new ProductCustomization(dummyProduct);

      aggregate.updateStepperModifier(stepperCategory, unavailableMod, 1);
      aggregate.updateStepperModifier(stepperCategory, hiddenMod, 1);
      expect(aggregate.getModifierQuantity('cat-stepper', 'm-off')).toBe(0);
      expect(aggregate.getModifierQuantity('cat-stepper', 'm-hidden')).toBe(0);
    });
  });
});
