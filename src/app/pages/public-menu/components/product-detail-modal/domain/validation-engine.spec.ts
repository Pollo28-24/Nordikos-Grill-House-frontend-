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
        { id: 's1', nombre: 'BBQ', precio: 0, visible: true, cantidad_maxima: 1 },
        { id: 's2', nombre: 'Ranch', precio: 15, visible: true, cantidad_maxima: 1 }
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
      modifier: { id: 's1', nombre: 'BBQ', precio: 0, visible: true, cantidad_maxima: 1 }
    });
    selectedMods.set('cat-salsas', salsaMap);

    const result = ValidationEngine.validate(productWithVariants, variant, categories, selectedMods);
    expect(result.isValid).toBeTrue();
    expect(result.blockingMessage).toBeUndefined();
  });
});
