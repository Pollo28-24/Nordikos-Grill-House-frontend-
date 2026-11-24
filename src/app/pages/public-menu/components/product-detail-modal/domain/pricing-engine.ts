import { Product, ProductVariant, SelectedModifierItem } from '@core/models/product.model';
import { PriceBreakdown } from '../models/customization.model';

export interface CardPriceInfo {
  readonly basePrice: number;
  readonly discount: number;
  readonly hasDiscount: boolean;
  readonly finalPrice: number | null;
  readonly isFrom: boolean;
  readonly allVariantsUnavailable: boolean;
}

/**
 * Motor de Precios Puro y Sin Estado (Stateless).
 * Calcula el desglose financiero exacto de la personalización:
 * Total = (Precio Base / Variante + Subtotal Modificadores) × Cantidad
 */
export class PricingEngine {
  private static computeNetPrice(
    rawPrice: number | null | undefined,
    rawDiscount: number | null | undefined
  ): { basePrice: number; discount: number; finalPrice: number } {
    const basePrice = Math.max(0, Number(rawPrice || 0));
    const rawDesc = Number(rawDiscount || 0);
    const discount = rawDesc > 0 ? rawDesc : 0;
    const finalPrice = Math.max(0, basePrice - discount);
    return { basePrice, discount, finalPrice };
  }

  static getCardPriceInfo(product: Product): CardPriceInfo {
    const variants = product.variants || [];

    if (variants.length > 0) {
      const availableVariants = variants.filter(v => v.disponible !== false);

      if (availableVariants.length === 0) {
        return {
          basePrice: 0,
          discount: 0,
          hasDiscount: false,
          finalPrice: null,
          isFrom: false,
          allVariantsUnavailable: true,
        };
      }

      const pricedVariants = availableVariants.map(v =>
        this.computeNetPrice(v.precio, v.descuento)
      );

      let minEntry = pricedVariants[0];
      let maxFinalPrice = pricedVariants[0].finalPrice;

      for (let i = 1; i < pricedVariants.length; i++) {
        const entry = pricedVariants[i];
        if (entry.finalPrice < minEntry.finalPrice) {
          minEntry = entry;
        }
        if (entry.finalPrice > maxFinalPrice) {
          maxFinalPrice = entry.finalPrice;
        }
      }

      return {
        basePrice: minEntry.basePrice,
        discount: minEntry.discount,
        hasDiscount: minEntry.discount > 0,
        finalPrice: minEntry.finalPrice,
        isFrom: minEntry.finalPrice !== maxFinalPrice,
        allVariantsUnavailable: false,
      };
    }

    const simple = this.computeNetPrice(product.precio, product.descuento);
    return {
      basePrice: simple.basePrice,
      discount: simple.discount,
      hasDiscount: simple.discount > 0,
      finalPrice: simple.finalPrice,
      isFrom: false,
      allVariantsUnavailable: false,
    };
  }

  static calculate(
    product: Product,
    selectedVariant: ProductVariant | null,
    selectedModifiers: Map<string | number, Map<string | number, SelectedModifierItem>>,
    quantity: number
  ): PriceBreakdown {
    // 1. Precio base unitario
    const baseUnitPrice = selectedVariant
      ? this.computeNetPrice(selectedVariant.precio, selectedVariant.descuento).finalPrice
      : this.computeNetPrice(product.precio, product.descuento).finalPrice;

    // 2. Subtotal de modificadores unitarios
    let modifiersUnitPrice = 0;
    selectedModifiers.forEach(catMap => {
      catMap.forEach(item => {
        modifiersUnitPrice += (item.subtotal || 0);
      });
    });

    const totalUnitPrice = baseUnitPrice + modifiersUnitPrice;
    const safeQuantity = Math.max(1, quantity);
    const finalTotal = totalUnitPrice * safeQuantity;

    return {
      baseUnitPrice,
      modifiersUnitPrice,
      totalUnitPrice,
      quantity: safeQuantity,
      finalTotal
    };
  }
}
