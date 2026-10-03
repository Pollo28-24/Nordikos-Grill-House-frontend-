import { Product, ProductVariant, SelectedModifierItem } from '@core/models/product.model';
import { GroupedCategory, ValidationIssue, ValidationResult } from '../models/customization.model';

/**
 * Motor de Validación Puro y Desacoplado de la UI.
 * Evalúa las reglas de negocio e invariantes de la personalización,
 * retornando una lista enriquecida de ValidationIssue[].
 */
export class ValidationEngine {
  static validate(
    product: Product,
    selectedVariant: ProductVariant | null,
    categories: readonly GroupedCategory[],
    selectedModifiers: Map<string | number, Map<string | number, SelectedModifierItem>>
  ): ValidationResult {
    const issues: ValidationIssue[] = [];

    // 1. Validar variantes requeridas si el producto cuenta con variantes
    if (product.variants && product.variants.length > 0) {
      if (!selectedVariant) {
        issues.push({
          id: 'variant-required',
          severity: 'error',
          message: 'Selecciona una presentación para continuar',
          blocking: true,
          fixSuggestion: 'Elige una de las opciones de tamaño o estilo disponibles'
        });
      }
    }

    // 2. Validar cada categoría de modificadores
    for (const group of categories) {
      const cat = group.category;
      const catMap = selectedModifiers.get(cat.id);
      let totalSelectedInCat = 0;
      catMap?.forEach(item => {
        totalSelectedInCat += item.cantidad;
      });

      // Regla de mínimo requerido
      if (cat.obligatorio && totalSelectedInCat < cat.min_selections) {
        const requiredCount = cat.min_selections;
        const msg = requiredCount === 1 
          ? `Selecciona 1 opción en "${cat.nombre}"`
          : `Selecciona al menos ${requiredCount} opciones en "${cat.nombre}"`;

        issues.push({
          id: `cat-min-${cat.id}`,
          severity: 'error',
          categoryId: cat.id,
          message: msg,
          blocking: true,
          fixSuggestion: `Faltan ${requiredCount - totalSelectedInCat} por elegir`
        });
      }

      // Regla de máximo permitido
      if (totalSelectedInCat > cat.max_selections) {
        issues.push({
          id: `cat-max-${cat.id}`,
          severity: 'error',
          categoryId: cat.id,
          message: `Máximo ${cat.max_selections} permitidos en "${cat.nombre}"`,
          blocking: true,
          fixSuggestion: `Deselecciona ${totalSelectedInCat - cat.max_selections} opción(es)`
        });
      }
    }

    const blockingIssues = issues.filter(i => i.blocking);
    const isValid = blockingIssues.length === 0;

    return {
      isValid,
      issues,
      blockingMessage: blockingIssues.length > 0 ? blockingIssues[0].message : undefined
    };
  }
}
