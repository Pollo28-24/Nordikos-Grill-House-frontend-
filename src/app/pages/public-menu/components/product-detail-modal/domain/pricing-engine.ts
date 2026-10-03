import { Product, ProductVariant, SelectedModifierItem } from '@core/models/product.model';
import { PriceBreakdown } from '../models/customization.model';

/**
 * Motor de Precios Puro y Sin Estado (Stateless).
 * Calcula el desglose financiero exacto de la personalización:
 * Total = (Precio Base / Variante + Subtotal Modificadores) × Cantidad
 */
export class PricingEngine {
  static calculate(
    product: Product,
    selectedVariant: ProductVariant | null,
    selectedModifiers: Map<string | number, Map<string | number, SelectedModifierItem>>,
    quantity: number
  ): PriceBreakdown {
    // 1. Precio base unitario
    let baseUnitPrice = 0;
    if (selectedVariant) {
      baseUnitPrice = Math.max(0, (selectedVariant.precio || 0) - (selectedVariant.descuento || 0));
    } else {
      baseUnitPrice = Math.max(0, (product.precio || 0) - (product.descuento || 0));
    }

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
