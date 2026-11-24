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

  it('calculate debe proteger con 0 un producto sin variantes cuyo descuento supera al precio', () => {
    const overDiscountedSimple: Product = {
      ...dummyProduct,
      precio: 50,
      descuento: 80,
      price_type: 'simple',
      variants: [],
    };

    const breakdown = PricingEngine.calculate(overDiscountedSimple, null, new Map(), 2);
    expect(breakdown.baseUnitPrice).toBe(0);
    expect(breakdown.modifiersUnitPrice).toBe(0);
    expect(breakdown.totalUnitPrice).toBe(0);
    expect(breakdown.finalTotal).toBe(0);
  });

  it('calculate debe mantener el cálculo exacto para variante con descuento y extras', () => {
    const selectedMods = new Map<string | number, Map<string | number, SelectedModifierItem>>();
    const extrasMap = new Map<string | number, SelectedModifierItem>();
    extrasMap.set(201, {
      modifierId: 201,
      categoryId: 2,
      nombre: 'Tocino Extra',
      cantidad: 2,
      precioUnitario: 25,
      subtotal: 50,
      modifier: { id: 201, nombre: 'Tocino Extra', precio: 25, visible: true, disponible: true, cantidad_maxima: 5 }
    });
    selectedMods.set(2, extrasMap);

    const breakdown = PricingEngine.calculate(dummyProduct, dummyVariant, selectedMods, 2);
    expect(breakdown.baseUnitPrice).toBe(140); // 160 - 20
    expect(breakdown.modifiersUnitPrice).toBe(50); // 25 * 2
    expect(breakdown.totalUnitPrice).toBe(190); // 140 + 50
    expect(breakdown.quantity).toBe(2);
    expect(breakdown.finalTotal).toBe(380); // 190 * 2
  });

  describe('Hallazgo (c): PricingEngine.getCardPriceInfo', () => {
    it('debe ignorar variantes agotadas al calcular el precio de la tarjeta', () => {
      const product: Product = {
        ...dummyProduct,
        precio: 0,
        descuento: 0,
        price_type: 'variants',
        variants: [
          { ...dummyVariant, id: 'v1', nombre: 'Chica', precio: 80, descuento: 0, disponible: false },
          { ...dummyVariant, id: 'v2', nombre: 'Mediana', precio: 120, descuento: 0, disponible: true }
        ]
      };

      const info = PricingEngine.getCardPriceInfo(product);
      expect(info.allVariantsUnavailable).toBeFalse();
      expect(info.finalPrice).toBe(120);
      expect(info.basePrice).toBe(120);
      expect(info.isFrom).toBeFalse();
    });

    it('debe aplicar el descuento propio de la variante coincidiendo con PricingEngine.calculate', () => {
      const variantWithDiscount: ProductVariant = {
        ...dummyVariant,
        id: 'v1',
        precio: 160,
        descuento: 20,
        disponible: true
      };
      const product: Product = {
        ...dummyProduct,
        precio: 0,
        descuento: 0,
        price_type: 'variants',
        variants: [variantWithDiscount]
      };

      const modalPrice = PricingEngine.calculate(product, variantWithDiscount, new Map(), 1).baseUnitPrice;
      const cardInfo = PricingEngine.getCardPriceInfo(product);

      expect(cardInfo.finalPrice).toBe(modalPrice);
      expect(cardInfo.finalPrice).toBe(140);
      expect(cardInfo.basePrice).toBe(160);
      expect(cardInfo.discount).toBe(20);
      expect(cardInfo.hasDiscount).toBeTrue();
    });

    it('no debe aplicar product.descuento sobre una variante sin descuento propio', () => {
      const variantNoDiscount: ProductVariant = {
        ...dummyVariant,
        id: 'v1',
        precio: 150,
        descuento: 0,
        disponible: true
      };
      const product: Product = {
        ...dummyProduct,
        precio: 0,
        descuento: 30,
        price_type: 'variants',
        variants: [variantNoDiscount]
      };

      const cardInfo = PricingEngine.getCardPriceInfo(product);
      expect(cardInfo.finalPrice).toBe(150);
      expect(cardInfo.hasDiscount).toBeFalse();
      expect(cardInfo.discount).toBe(0);
    });

    it('debe marcar isFrom=true cuando hay precios netos distintos y isFrom=false cuando son iguales', () => {
      const distinctProduct: Product = {
        ...dummyProduct,
        precio: 0,
        descuento: 0,
        price_type: 'variants',
        variants: [
          { ...dummyVariant, id: 'v1', precio: 100, descuento: 0, disponible: true },
          { ...dummyVariant, id: 'v2', precio: 140, descuento: 0, disponible: true }
        ]
      };
      const distinctInfo = PricingEngine.getCardPriceInfo(distinctProduct);
      expect(distinctInfo.isFrom).toBeTrue();
      expect(distinctInfo.finalPrice).toBe(100);

      const equalNetProduct: Product = {
        ...dummyProduct,
        precio: 0,
        descuento: 0,
        price_type: 'variants',
        variants: [
          { ...dummyVariant, id: 'v1', precio: 100, descuento: 0, disponible: true },
          { ...dummyVariant, id: 'v2', precio: 120, descuento: 20, disponible: true }
        ]
      };
      const equalInfo = PricingEngine.getCardPriceInfo(equalNetProduct);
      expect(equalInfo.isFrom).toBeFalse();
      expect(equalInfo.finalPrice).toBe(100);
    });

    it('debe reportar allVariantsUnavailable=true y finalPrice=null cuando todas las variantes están agotadas', () => {
      const product: Product = {
        ...dummyProduct,
        precio: 0,
        descuento: 0,
        price_type: 'variants',
        variants: [
          { ...dummyVariant, id: 'v1', precio: 100, descuento: 0, disponible: false },
          { ...dummyVariant, id: 'v2', precio: 140, descuento: 0, disponible: false }
        ]
      };

      const info = PricingEngine.getCardPriceInfo(product);
      expect(info.allVariantsUnavailable).toBeTrue();
      expect(info.finalPrice).toBeNull();
    });

    it('debe proteger el precio final de producto simple con Math.max(0, ...) si descuento > precio', () => {
      const product: Product = {
        ...dummyProduct,
        precio: 50,
        descuento: 80,
        price_type: 'simple',
        variants: []
      };

      const info = PricingEngine.getCardPriceInfo(product);
      expect(info.finalPrice).toBe(0);
    });

    it('coherencia: finalPrice de getCardPriceInfo debe igualar el total de PricingEngine.calculate (sin extras) en simple, con variantes y con descuento por variante', () => {
      // 1. Producto simple con descuento
      const simpleProduct: Product = {
        ...dummyProduct,
        precio: 120,
        descuento: 15,
        price_type: 'simple',
        variants: []
      };
      expect(PricingEngine.getCardPriceInfo(simpleProduct).finalPrice).toBe(
        PricingEngine.calculate(simpleProduct, null, new Map(), 1).finalTotal
      );

      // 2. Producto con variantes (sin descuento por variante)
      const cheapestVar: ProductVariant = { ...dummyVariant, id: 'v-a', precio: 95, descuento: 0, disponible: true };
      const pricierVar: ProductVariant = { ...dummyVariant, id: 'v-b', precio: 145, descuento: 0, disponible: true };
      const variantsProduct: Product = {
        ...dummyProduct,
        precio: 0,
        descuento: 0,
        price_type: 'variants',
        variants: [pricierVar, cheapestVar]
      };
      expect(PricingEngine.getCardPriceInfo(variantsProduct).finalPrice).toBe(
        PricingEngine.calculate(variantsProduct, cheapestVar, new Map(), 1).finalTotal
      );

      // 3. Producto con variantes y descuento por variante
      const cheapestNetVar: ProductVariant = { ...dummyVariant, id: 'v-c', precio: 160, descuento: 35, disponible: true };
      const otherDiscountVar: ProductVariant = { ...dummyVariant, id: 'v-d', precio: 150, descuento: 10, disponible: true };
      const discountedVariantsProduct: Product = {
        ...dummyProduct,
        precio: 0,
        descuento: 0,
        price_type: 'variants',
        variants: [otherDiscountVar, cheapestNetVar]
      };
      expect(PricingEngine.getCardPriceInfo(discountedVariantsProduct).finalPrice).toBe(
        PricingEngine.calculate(discountedVariantsProduct, cheapestNetVar, new Map(), 1).finalTotal
      );
    });
  });
});
