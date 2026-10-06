import { Injectable, signal, computed, inject } from '@angular/core';
import { Product, ProductVariant, Modifier, ModifierCategory, SelectedModifierItem } from '@core/models/product.model';
import { CustomizationSection, GroupedCategory, PriceBreakdown, ValidationResult, CartCustomization } from '../models/customization.model';
import { ProductCustomization } from '../domain/product-customization.aggregate';
import { PricingEngine } from '../domain/pricing-engine';
import { ValidationEngine } from '../domain/validation-engine';
import { ToastService } from '@core/services/toast.service';

@Injectable()
export class CustomizationStore {
  private toastService = inject(ToastService);

  // Aggregate Root interno (el Store es su propietario durante el ciclo de vida del modal)
  private aggregate: ProductCustomization | null = null;

  // Estado reactivo sincronizado con el Aggregate
  readonly product = signal<Product | null>(null);
  readonly selectedVariant = signal<ProductVariant | null>(null);
  readonly selectedModifiers = signal<Map<string | number, Map<string | number, SelectedModifierItem>>>(new Map());
  readonly quantity = signal<number>(1);
  readonly notes = signal<string>('');
  readonly activeSectionIndex = signal<number>(0);
  readonly isAdded = signal<boolean>(false);

  readonly quickChips: readonly string[] = [
    'Sin cebolla',
    'Sin tomate',
    'Sin chile',
    'Sin verdura',
    'Sin pepinillos',
    'Sin mayonesa',
    'Sin mostaza',
    'Sin catsup',
    'Sin Aderezo',
    'Sin ningún tipo de aderezo',
    'Bien cocida la carne',
    'Sin queso amarillo',
    'Sin queso manchego',
    'Sin queso quesillo'
  ];

  // 1. Categorías agrupadas de modificadores
  readonly categoriesWithModifiers = computed<GroupedCategory[]>(() => {
    const p = this.product();
    if (!p || !p.modifiers || p.modifiers.length === 0) return [];

    const groupMap = new Map<string | number, GroupedCategory>();

    p.modifiers.forEach(m => {
      // En el Menú Digital Público solo se muestran los modificadores visibles
      if (m.visible === false) return;

      const cat = m.modificador_categorias || {
        id: 'extras',
        nombre: 'Extras y Opciones',
        visible: true,
        tipo_seleccion: 'CHECKBOX',
        min_selections: 0,
        max_selections: 99,
        obligatorio: false,
        orden_visual: 99
      };

      if (!groupMap.has(cat.id)) {
        groupMap.set(cat.id, { category: cat, items: [] });
      }
      (groupMap.get(cat.id)!.items as Modifier[]).push(m);
    });

    return Array.from(groupMap.values()).sort((a, b) => a.category.orden_visual - b.category.orden_visual);
  });

  // 2. Cálculo financiero reactivo con PricingEngine
  readonly pricing = computed<PriceBreakdown>(() => {
    const p = this.product();
    if (!p) {
      return { baseUnitPrice: 0, modifiersUnitPrice: 0, totalUnitPrice: 0, quantity: 1, finalTotal: 0 };
    }
    return PricingEngine.calculate(
      p,
      this.selectedVariant(),
      this.selectedModifiers(),
      this.quantity()
    );
  });

  // 3. Validación reactiva de reglas de negocio con ValidationEngine
  readonly validation = computed<ValidationResult>(() => {
    const p = this.product();
    if (!p) return { isValid: true, issues: [] };

    return ValidationEngine.validate(
      p,
      this.selectedVariant(),
      this.categoriesWithModifiers(),
      this.selectedModifiers()
    );
  });

  // 4. Secciones ViewModel para la navegación horizontal
  readonly sections = computed<CustomizationSection[]>(() => {
    const p = this.product();
    if (!p) return [];

    const list: CustomizationSection[] = [];

    // Sección A: Presentación / Variantes
    if (p.variants && p.variants.length > 0) {
      const variant = this.selectedVariant();
      const isComplete = Boolean(variant);
      list.push({
        id: 'variants',
        title: 'Presentación',
        type: 'variants',
        isRequired: true,
        isComplete,
        selectionCount: isComplete ? 1 : 0,
        badgeText: isComplete ? '✓' : 'Requerido *'
      });
    }

    // Sección B: Categorías de Modificadores
    const selected = this.selectedModifiers();
    for (const group of this.categoriesWithModifiers()) {
      const cat = group.category;
      const catMap = selected.get(cat.id);
      let count = 0;
      catMap?.forEach(item => count += item.cantidad);

      const isRequired = Boolean(cat.obligatorio || cat.min_selections > 0);
      const minRequired = cat.min_selections > 0 ? cat.min_selections : 1;
      const isComplete = !isRequired || count >= minRequired;

      let badgeText: string | undefined = undefined;
      if (count > 0) {
        badgeText = `✓ (${count})`;
      } else if (isRequired) {
        badgeText = `Mín. ${minRequired} *`;
      }

      list.push({
        id: `cat-${cat.id}`,
        title: cat.nombre,
        type: 'modifier-category',
        isRequired,
        isComplete,
        selectionCount: count,
        badgeText,
        data: group
      });
    }

    // Sección C: Notas e Instrucciones
    const hasNote = Boolean(this.notes().trim());
    list.push({
      id: 'notes',
      title: 'Instrucciones',
      type: 'notes',
      isRequired: false,
      isComplete: hasNote,
      selectionCount: hasNote ? 1 : 0,
      badgeText: hasNote ? '✓' : undefined
    });

    return list;
  });

  /**
   * Inicializa la personalización con un producto.
   */
  init(product: Product): void {
    this.aggregate = new ProductCustomization(product);
    this.product.set(product);
    this.selectedVariant.set(this.aggregate.selectedVariant);
    this.selectedModifiers.set(new Map(this.aggregate.selectedModifiers));
    this.quantity.set(this.aggregate.quantity);
    this.notes.set(this.aggregate.notes);
    this.activeSectionIndex.set(0);
    this.isAdded.set(false);
  }

  // Comandos que delegan en el Aggregate Root y sincronizan las Signals

  selectVariant(variant: ProductVariant): void {
    if (!this.aggregate) return;
    this.aggregate.selectVariant(variant);
    this.selectedVariant.set(this.aggregate.selectedVariant);
  }

  selectRadioModifier(cat: ModifierCategory, mod: Modifier): void {
    if (!this.aggregate) return;
    this.aggregate.selectRadioModifier(cat, mod);
    this.selectedModifiers.set(new Map(this.aggregate.selectedModifiers));
  }

  toggleCheckboxModifier(cat: ModifierCategory, mod: Modifier): void {
    if (!this.aggregate) return;
    const catMap = this.aggregate.selectedModifiers.get(cat.id);
    const isAlreadySelected = Boolean(catMap?.has(mod.id));

    if (!isAlreadySelected && catMap && catMap.size >= cat.max_selections) {
      this.toastService.show(
        `Máximo ${cat.max_selections} ${cat.max_selections === 1 ? 'opción permitida' : 'opciones permitidas'} en "${cat.nombre}"`,
        'warning'
      );
      return;
    }

    this.aggregate.toggleCheckboxModifier(cat, mod);
    this.selectedModifiers.set(new Map(this.aggregate.selectedModifiers));
  }

  updateStepperModifier(cat: ModifierCategory, mod: Modifier, delta: number): void {
    if (!this.aggregate) return;
    const catMap = this.aggregate.selectedModifiers.get(cat.id);
    const currentQty = catMap?.get(mod.id)?.cantidad || 0;
    const itemMax = Number(mod.cantidad_maxima || 1);

    if (delta > 0) {
      if (currentQty >= itemMax) {
        this.toastService.show(
          `Máximo ${itemMax} ${itemMax === 1 ? 'porción' : 'porciones'} de "${mod.nombre}"`,
          'warning'
        );
        return;
      }

      let catTotal = 0;
      catMap?.forEach(item => { catTotal += item.cantidad; });
      if (catTotal >= cat.max_selections) {
        this.toastService.show(
          `Límite máximo de "${cat.nombre}" alcanzado (${cat.max_selections})`,
          'warning'
        );
        return;
      }
    }

    this.aggregate.updateStepperModifier(cat, mod, delta);
    this.selectedModifiers.set(new Map(this.aggregate.selectedModifiers));
  }

  updateQuantity(delta: number): void {
    if (!this.aggregate) return;
    this.aggregate.updateQuantity(delta);
    this.quantity.set(this.aggregate.quantity);
  }

  setQuantity(qty: number): void {
    if (!this.aggregate) return;
    this.aggregate.setQuantity(qty);
    this.quantity.set(this.aggregate.quantity);
  }

  setNotes(notes: string): void {
    if (!this.aggregate) return;
    this.aggregate.setNotes(notes);
    this.notes.set(this.aggregate.notes);
  }

  addNoteChip(chip: string): void {
    if (!this.aggregate) return;
    this.aggregate.addNoteChip(chip);
    this.notes.set(this.aggregate.notes);
  }

  setActiveSectionIndex(index: number): void {
    this.activeSectionIndex.set(index);
  }

  setIsAdded(val: boolean): void {
    this.isAdded.set(val);
  }

  isModifierSelected(categoryId: string | number, modifierId: string | number): boolean {
    return Boolean(this.selectedModifiers().get(categoryId)?.has(modifierId));
  }

  getModifierQuantity(categoryId: string | number, modifierId: string | number): number {
    return this.selectedModifiers().get(categoryId)?.get(modifierId)?.cantidad || 0;
  }

  getCategorySelectedCount(categoryId: string | number): number {
    let count = 0;
    this.selectedModifiers().get(categoryId)?.forEach(item => count += item.cantidad);
    return count;
  }

  /**
   * Genera el Snapshot inmutable para el carrito.
   */
  buildCartCustomization(): CartCustomization | null {
    if (!this.aggregate || !this.validation().isValid) return null;
    return this.aggregate.toCartCustomization(this.pricing());
  }
}
