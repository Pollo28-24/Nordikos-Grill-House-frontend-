import { Product, ProductVariant, SelectedModifierItem } from '@core/models/product.model';
import { GroupedCategory } from '../models/customization.model';
import { ValidationEngine } from './validation-engine';

describe('ValidationEngine', () => {
  const productWithVariants: Product = {
    id: '1',
    nombre: 'Burger',
    precio: 100,
    price_type: 'variants',
    disponible: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    variants: [
      { id: 'v1', producto_id: '1', nombre: 'Chica', precio: 100, disponible: true, created_at: '', updated_at: '' },
      { id: 'v2', producto_id: '1', nombre: 'Grande', precio: 140, disponible: true, created_at: '', updated_at: '' }
    ]
  };

  const categories: GroupedCategory[] = [
    {
      category: {
        id: 'cat-salsas',
        nombre: 'Salsas',
        visible: true,
        tipo_seleccion: 'RADIO',
        min_selections: 1,
        max_selections: 1,
        obligatorio: true,
        orden_visual: 1
      },
      items: [
        { id: 's1', nombre: 'BBQ', precio: 0, visible: true, disponible: true, cantidad_maxima: 1 },
        { id: 's2', nombre: 'Ranch', precio: 15, visible: true, disponible: true, cantidad_maxima: 1 }
      ]
    }
  ];

  it('debe bloquear si el producto tiene variantes y ninguna está seleccionada', () => {
    const result = ValidationEngine.validate(productWithVariants, null, [], new Map());
    expect(result.isValid).toBeFalse();
    expect(result.blockingMessage).toContain('Selecciona una presentación');
  });

  it('debe bloquear si una categoría obligatoria no tiene selección mínima', () => {
    const variant = productWithVariants.variants![0];
    const result = ValidationEngine.validate(productWithVariants, variant, categories, new Map());
    expect(result.isValid).toBeFalse();
    expect(result.blockingMessage).toContain('Selecciona 1 opción en "Salsas"');
  });

  it('debe ser válido cuando se cumplen todas las reglas obligatorias', () => {
    const variant = productWithVariants.variants![0];
    const selectedMods = new Map<string | number, Map<string | number, SelectedModifierItem>>();
    const salsaMap = new Map<string | number, SelectedModifierItem>();
    salsaMap.set('s1', {
      modifierId: 's1',
      categoryId: 'cat-salsas',
      nombre: 'BBQ',
      cantidad: 1,
      precioUnitario: 0,
      subtotal: 0,
      modifier: { id: 's1', nombre: 'BBQ', precio: 0, visible: true, disponible: true, cantidad_maxima: 1 }
    });
    selectedMods.set('cat-salsas', salsaMap);

    const result = ValidationEngine.validate(productWithVariants, variant, categories, selectedMods);
    expect(result.isValid).toBeTrue();
    expect(result.blockingMessage).toBeUndefined();
  });

  describe('Hallazgo (a): validación de variantes y modificadores agotados', () => {
    it('debe bloquear con issue explícito (variant-unavailable) cuando la variante seleccionada está agotada', () => {
      const unavailableVariant: ProductVariant = {
        id: 'v-off',
        producto_id: '1',
        nombre: 'Agotada',
        precio: 100,
        disponible: false,
        created_at: '',
        updated_at: ''
      };

      const result = ValidationEngine.validate(productWithVariants, unavailableVariant, [], new Map());
      expect(result.isValid).toBeFalse();
      expect(result.issues.some(i => i.id === 'variant-unavailable')).toBeTrue();
      expect(result.blockingMessage?.toLowerCase()).toContain('disponible');
    });

    it('debe bloquear con issue explícito (variant-all-unavailable) cuando todas las variantes están agotadas', () => {
      const productAllUnavailable: Product = {
        ...productWithVariants,
        variants: [
          { id: 'v1', producto_id: '1', nombre: 'Chica', precio: 100, disponible: false, created_at: '', updated_at: '' },
          { id: 'v2', producto_id: '1', nombre: 'Grande', precio: 140, disponible: false, created_at: '', updated_at: '' }
        ]
      };

      const result = ValidationEngine.validate(productAllUnavailable, null, [], new Map());
      expect(result.isValid).toBeFalse();
      expect(result.issues.some(i => i.id === 'variant-all-unavailable')).toBeTrue();
      expect(result.blockingMessage?.toLowerCase()).toContain('disponible');
    });

    it('debe bloquear con issue explícito (cat-all-unavailable-*) cuando una categoría obligatoria no tiene opciones disponibles', () => {
      const unavailableCategories: GroupedCategory[] = [
        {
          category: categories[0].category,
          items: [
            { id: 's1', nombre: 'BBQ', precio: 0, visible: true, disponible: false, cantidad_maxima: 1 },
            { id: 's2', nombre: 'Ranch', precio: 15, visible: true, disponible: false, cantidad_maxima: 1 }
          ]
        }
      ];

      const variant = productWithVariants.variants![0];
      const result = ValidationEngine.validate(productWithVariants, variant, unavailableCategories, new Map());
      expect(result.isValid).toBeFalse();
      expect(result.issues.some(i => i.id === 'cat-all-unavailable-cat-salsas')).toBeTrue();
      expect(result.blockingMessage?.toLowerCase()).toContain('disponible');
    });

    it('debe bloquear si hay un modificador seleccionado marcado como agotado (disponible: false)', () => {
      const variant = productWithVariants.variants![0];
      const selectedMods = new Map<string | number, Map<string | number, SelectedModifierItem>>();
      const salsaMap = new Map<string | number, SelectedModifierItem>();
      salsaMap.set('s1', {
        modifierId: 's1',
        categoryId: 'cat-salsas',
        nombre: 'BBQ',
        cantidad: 1,
        precioUnitario: 0,
        subtotal: 0,
        modifier: { id: 's1', nombre: 'BBQ', precio: 0, visible: true, disponible: false, cantidad_maxima: 1 }
      });
      selectedMods.set('cat-salsas', salsaMap);

      const result = ValidationEngine.validate(productWithVariants, variant, categories, selectedMods);
      expect(result.isValid).toBeFalse();
      expect(result.issues.some(i => i.id === 'mod-unavailable-s1')).toBeTrue();
      expect(result.blockingMessage?.toLowerCase()).toContain('disponible');
    });
  });
});
