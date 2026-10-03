import { Product, ProductVariant, Modifier, ModifierCategory, SelectedModifierItem } from '@core/models/product.model';
import { CartCustomization, PriceBreakdown } from '../models/customization.model';

/**
 * Aggregate Root del Dominio: ProductCustomization
 * Encapsula y protege todas las invariantes de negocio de la personalización de un producto:
 * - Selección exclusiva en categorías RADIO.
 * - Límites de selección mínima y máxima en categorías CHECKBOX y STEPPER.
 * - Inmutabilidad de referencias para Signals reactivas (Guardrail 14).
 * - Emisión inmutable de CartCustomization (Value Object).
 */
export class ProductCustomization {
  readonly productId: string | number;
  private _product: Product;
  private _selectedVariant: ProductVariant | null = null;
  private _selectedModifiers: Map<string | number, Map<string | number, SelectedModifierItem>> = new Map();
  private _quantity: number = 1;
  private _notes: string = '';

  constructor(product: Product) {
    this.productId = product.id;
    this._product = product;

    // Inicializar primera variante si existe
    if (product.variants && product.variants.length > 0) {
      this._selectedVariant = product.variants[0];
    }

    // Preseleccionar opciones RADIO obligatorias que contengan exactamente 1 opción
    if (product.modifiers && product.modifiers.length > 0) {
      const preselected = new Map<string | number, Map<string | number, SelectedModifierItem>>();
      
      const groups = new Map<string | number, { cat: ModifierCategory; items: Modifier[] }>();
      product.modifiers.forEach(m => {
        const cat = m.modificador_categorias;
        if (cat) {
          if (!groups.has(cat.id)) groups.set(cat.id, { cat, items: [] });
          groups.get(cat.id)!.items.push(m);
        }
      });

      groups.forEach(({ cat, items }) => {
        if (cat.tipo_seleccion === 'RADIO' && cat.obligatorio && items.length > 0) {
          const first = items[0];
          const catMap = new Map<string | number, SelectedModifierItem>();
          catMap.set(first.id, {
            modifierId: first.id,
            categoryId: cat.id,
            nombre: first.nombre,
            cantidad: 1,
            precioUnitario: first.precio,
            subtotal: first.precio,
            modifier: first
          });
          preselected.set(cat.id, catMap);
        }
      });

      this._selectedModifiers = preselected;
    }
  }

  // Getters puros (Lectura inmutable)
  get product(): Product {
    return this._product;
  }

  get selectedVariant(): ProductVariant | null {
    return this._selectedVariant;
  }

  get selectedModifiers(): Map<string | number, Map<string | number, SelectedModifierItem>> {
    return this._selectedModifiers;
  }

  get quantity(): number {
    return this._quantity;
  }

  get notes(): string {
    return this._notes;
  }

  // Operaciones de Dominio (Mutaciones seguras con nuevas referencias para reactividad)

  selectVariant(variant: ProductVariant | null): void {
    this._selectedVariant = variant;
  }

  selectRadioModifier(cat: ModifierCategory, mod: Modifier): void {
    const nextModifiers = new Map(this._selectedModifiers);
    const catMap = new Map<string | number, SelectedModifierItem>();

    const alreadySelected = nextModifiers.get(cat.id)?.has(mod.id);
    if (alreadySelected && !cat.obligatorio) {
      nextModifiers.delete(cat.id);
    } else {
      catMap.set(mod.id, {
        modifierId: mod.id,
        categoryId: cat.id,
        nombre: mod.nombre,
        cantidad: 1,
        precioUnitario: mod.precio,
        subtotal: mod.precio,
        modifier: mod
      });
      nextModifiers.set(cat.id, catMap);
    }

    this._selectedModifiers = nextModifiers;
  }

  toggleCheckboxModifier(cat: ModifierCategory, mod: Modifier): void {
    const nextModifiers = new Map(this._selectedModifiers);
    const catMap = new Map(nextModifiers.get(cat.id) || new Map());

    if (catMap.has(mod.id)) {
      catMap.delete(mod.id);
    } else {
      // Invariante: no exceder max_selections
      if (catMap.size >= cat.max_selections) {
        return;
      }
      catMap.set(mod.id, {
        modifierId: mod.id,
        categoryId: cat.id,
        nombre: mod.nombre,
        cantidad: 1,
        precioUnitario: mod.precio,
        subtotal: mod.precio,
        modifier: mod
      });
    }

    if (catMap.size === 0) {
      nextModifiers.delete(cat.id);
    } else {
      nextModifiers.set(cat.id, catMap);
    }

    this._selectedModifiers = nextModifiers;
  }

  updateStepperModifier(cat: ModifierCategory, mod: Modifier, delta: number): void {
    const nextModifiers = new Map(this._selectedModifiers);
    const catMap = new Map(nextModifiers.get(cat.id) || new Map());
    const currentItem = catMap.get(mod.id);
    const currentQty = currentItem?.cantidad || 0;
    const newQty = currentQty + delta;

    if (newQty <= 0) {
      catMap.delete(mod.id);
    } else {
      const maxAllowed = mod.cantidad_maxima || 99;
      if (newQty > maxAllowed) return;

      // Invariante: verificar que no exceda el máximo acumulado de la categoría
      let otherTotal = 0;
      catMap.forEach((item, id) => {
        if (id !== mod.id) otherTotal += item.cantidad;
      });
      if (otherTotal + newQty > cat.max_selections) return;

      catMap.set(mod.id, {
        modifierId: mod.id,
        categoryId: cat.id,
        nombre: mod.nombre,
        cantidad: newQty,
        precioUnitario: mod.precio,
        subtotal: mod.precio * newQty,
        modifier: mod
      });
    }

    if (catMap.size === 0) {
      nextModifiers.delete(cat.id);
    } else {
      nextModifiers.set(cat.id, catMap);
    }

    this._selectedModifiers = nextModifiers;
  }

  updateQuantity(delta: number): void {
    this._quantity = Math.max(1, this._quantity + delta);
  }

  setQuantity(qty: number): void {
    this._quantity = Math.max(1, qty);
  }

  setNotes(notes: string): void {
    this._notes = notes;
  }

  addNoteChip(chip: string): void {
    const current = this._notes.trim();
    if (!current) {
      this._notes = chip;
    } else if (!current.toLowerCase().includes(chip.toLowerCase())) {
      this._notes = `${current}, ${chip}`;
    }
  }

  // Consultas sobre el estado
  isModifierSelected(categoryId: string | number, modifierId: string | number): boolean {
    return Boolean(this._selectedModifiers.get(categoryId)?.has(modifierId));
  }

  getModifierQuantity(categoryId: string | number, modifierId: string | number): number {
    return this._selectedModifiers.get(categoryId)?.get(modifierId)?.cantidad || 0;
  }

  getCategorySelectedCount(categoryId: string | number): number {
    let count = 0;
    this._selectedModifiers.get(categoryId)?.forEach(item => {
      count += item.cantidad;
    });
    return count;
  }

  /**
   * Mapea el estado actual a un Snapshot inmutable (Value Object)
   * listo para ser consumido por el carrito sin mutaciones posteriores.
   */
  toCartCustomization(pricing: PriceBreakdown): CartCustomization {
    const flatModifiers: SelectedModifierItem[] = [];
    this._selectedModifiers.forEach(catMap => {
      catMap.forEach(item => {
        flatModifiers.push({ ...item });
      });
    });

    return {
      product: this._product,
      variant: this._selectedVariant ? { ...this._selectedVariant } : null,
      quantity: this._quantity,
      modifiers: Object.freeze(flatModifiers),
      note: this._notes.trim() || undefined,
      pricing: { ...pricing }
    };
  }
}
