import { Product, ProductVariant, SelectedModifierItem } from '@core/models/product.model';
import { PricingEngine } from './pricing-engine';

describe('PricingEngine', () => {
  const dummyProduct: Product = {
    id: '1',
    nombre: 'Hamburguesa Nórdika',
    precio: 120,
    price_type: 'simple',
    descuento: 10,
    disponible: true,
    categoria_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const dummyVariant: ProductVariant = {
    id: 'v1',
    producto_id: '1',
    nombre: 'Doble Carne',
    precio: 160,
    descuento: 20,
    disponible: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('debe calcular precio base de producto simple con descuento', () => {
    const breakdown = PricingEngine.calculate(dummyProduct, null, new Map(), 1);
    expect(breakdown.baseUnitPrice).toBe(110); // 120 - 10
    expect(breakdown.modifiersUnitPrice).toBe(0);
    expect(breakdown.totalUnitPrice).toBe(110);
    expect(breakdown.finalTotal).toBe(110);
  });

  it('debe calcular precio base de variante cuando está seleccionada', () => {
    const breakdown = PricingEngine.calculate(dummyProduct, dummyVariant, new Map(), 1);
    expect(breakdown.baseUnitPrice).toBe(140); // 160 - 20
    expect(breakdown.totalUnitPrice).toBe(140);
    expect(breakdown.finalTotal).toBe(140);
  });

  it('debe sumar subtotal de modificadores correctamente', () => {
    const selectedMods = new Map<string | number, Map<string | number, SelectedModifierItem>>();
    const cat1 = new Map<string | number, SelectedModifierItem>();
    cat1.set(101, {
      modifierId: 101,
      categoryId: 1,
      nombre: 'Queso Extra',
      cantidad: 2,
      precioUnitario: 20,
      subtotal: 40,
      modifier: { id: 101, nombre: 'Queso Extra', precio: 20, visible: true, disponible: true, cantidad_maxima: 5 }
    });
    selectedMods.set(1, cat1);

    const breakdown = PricingEngine.calculate(dummyProduct, null, selectedMods, 2);
    expect(breakdown.baseUnitPrice).toBe(110);
    expect(breakdown.modifiersUnitPrice).toBe(40);
    expect(breakdown.totalUnitPrice).toBe(150); // 110 + 40
    expect(breakdown.quantity).toBe(2);
    expect(breakdown.finalTotal).toBe(300); // 150 * 2
  });
});
