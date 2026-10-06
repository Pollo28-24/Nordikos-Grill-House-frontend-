import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  viewChild,
  ElementRef,
  inject,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '../../../../../../core/services/toast.service';
import { CustomizerVariantsSection } from './components/customizer-variants-section';
import { CustomizerModifiersSection } from './components/customizer-modifiers-section';
import { CustomizerInstructionsSection } from './components/customizer-instructions-section';
import { CustomizerFooter } from './components/customizer-footer';

export interface ModalSection {
  id: string;
  title: string;
  type: 'variants' | 'modifier-group' | 'instructions';
  isRequired: boolean;
  isComplete: boolean;
  count: number;
  badge: string;
  data?: any;
}

export interface ProductCustomizationResult {
  product: any;
  variants: any[];
  variant: any;
  modifiers: Array<{
    modificador_id: any;
    nombre_modificador: string;
    cantidad: number;
    precio_unitario: number;
  }>;
  note: string | null;
}

@Component({
  selector: 'app-product-customizer-modal',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    CustomizerVariantsSection,
    CustomizerModifiersSection,
    CustomizerInstructionsSection,
    CustomizerFooter
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-customizer-modal.html'
})
export class ProductCustomizerModal {
  private toastService = inject(ToastService);

  // Inputs & Outputs
  readonly product = input.required<any>();
  readonly editingOrderId = input<number | string | null>(null);

  readonly close = output<void>();
  readonly confirmed = output<ProductCustomizationResult>();

  readonly pagesContainer = viewChild<ElementRef<HTMLDivElement>>('pagesContainer');

  // Internal state
  selectedVariant = signal<any>(null);
  selectedVariants = signal<any[]>([]);
  selectedModifiers = signal<any[]>([]);
  productNote = signal<string>('');
  activeSectionIndex = signal<number>(0);

  constructor() {
    effect(() => {
      const p = this.product();
      if (!p) return;

      this.productNote.set('');
      this.activeSectionIndex.set(0);

      // Preseleccionar primera variante disponible
      const firstAvailable = p.variants?.find((v: any) => v.disponible !== false);
      if (firstAvailable) {
        this.selectedVariants.set([{ ...firstAvailable, qty: 1 }]);
        this.selectedVariant.set(firstAvailable);
      } else {
        this.selectedVariants.set([]);
        this.selectedVariant.set(null);
      }

      this.selectedModifiers.set([]);

      setTimeout(() => {
        const container = this.pagesContainer()?.nativeElement;
        if (container) {
          container.scrollLeft = 0;
        }
      }, 50);
    });
  }

  // Grouped modifiers for modal with category rules and sorting
  groupedModifiers = computed(() => {
    const p = this.product();
    if (!p || !p.modifiers) return [];

    const groups: Record<string, { name: string; category?: any; items: any[] }> = {};

    p.modifiers.forEach((m: any) => {
      const cat = m.modificador_categorias;
      const catName = cat?.nombre || 'Extras opcionales';
      const catKey = cat?.id ? String(cat.id) : catName;

      if (!groups[catKey]) {
        groups[catKey] = { name: catName, category: cat, items: [] };
      }
      groups[catKey].items.push(m);
    });

    return Object.values(groups).sort((a, b) => {
      const orderA = Number(a.category?.orden_visual ?? 10);
      const orderB = Number(b.category?.orden_visual ?? 10);
      return orderA - orderB;
    });
  });

  // Dynamic sections with status for navigation & pages
  sections = computed<ModalSection[]>(() => {
    const p = this.product();
    if (!p) return [];

    const list: ModalSection[] = [];

    // 1. Variantes
    if (p.variants && p.variants.length > 0) {
      const selectedVars = this.selectedVariants();
      const isComplete = selectedVars.length > 0 && selectedVars.some(sv =>
        p.variants.some((pv: any) => pv.id === sv.id && pv.disponible !== false)
      );
      list.push({
        id: 'variants',
        title: 'Opciones',
        type: 'variants',
        isRequired: true,
        isComplete,
        count: selectedVars.length,
        badge: isComplete ? '✓' : 'Requerido *'
      });
    }

    // 2. Modificadores agrupados por categoría
    const groups = this.groupedModifiers();
    groups.forEach((group, idx) => {
      const selectedModsInGroup = this.selectedModifiers().filter(sm =>
        group.items.some((gi: any) => gi.id === sm.id)
      );
      const count = selectedModsInGroup.reduce((acc, m) => acc + (Number(m.qty) || 1), 0);
      const cat = group.category;
      const isRequired = cat ? Boolean(cat.obligatorio || cat.min_selections > 0) : false;
      const minRequired = cat ? (cat.min_selections > 0 ? cat.min_selections : (isRequired ? 1 : 0)) : 0;
      const isComplete = !isRequired || count >= minRequired;

      let badge = `${count}`;
      if (isRequired) {
        badge = isComplete ? `✓ (${count})` : `Mín. ${minRequired} *`;
      } else if (count > 0) {
        badge = `✓ (${count})`;
      }

      list.push({
        id: `mod-group-${idx}`,
        title: group.name,
        type: 'modifier-group',
        isRequired,
        isComplete,
        count,
        badge,
        data: group
      });
    });

    // 3. Instrucciones / Nota
    const hasNote = (this.productNote() || '').trim().length > 0;
    list.push({
      id: 'instructions',
      title: 'Instrucciones',
      type: 'instructions',
      isRequired: false,
      isComplete: hasNote,
      count: hasNote ? 1 : 0,
      badge: hasNote ? '✓' : '—'
    });

    return list;
  });

  // Validation: blocking reason
  blockingReason = computed<string | null>(() => {
    const p = this.product();
    if (!p) return 'Selecciona un producto';

    // 1. Variantes requeridas
    if (p.variants && p.variants.length > 0) {
      const selected = this.selectedVariants();
      if (selected.length === 0) return 'Elige una presentación o tamaño';
      const hasValid = selected.some(sv =>
        p.variants.some((pv: any) => pv.id === sv.id && pv.disponible !== false)
      );
      if (!hasValid) return 'Elige una presentación disponible';
    }

    // 2. Modificadores obligatorios según categoría
    const groups = this.groupedModifiers();
    for (const group of groups) {
      const cat = group.category;
      if (!cat) continue;
      const isRequired = Boolean(cat.obligatorio || cat.min_selections > 0);
      if (isRequired) {
        const selectedInGroup = this.selectedModifiers().filter(sm =>
          group.items.some((gi: any) => gi.id === sm.id)
        );
        const totalQty = selectedInGroup.reduce((acc, m) => acc + (Number(m.qty) || 1), 0);
        const minRequired = cat.min_selections > 0 ? cat.min_selections : 1;
        if (totalQty < minRequired) {
          return `Falta elegir: "${group.name}" (mínimo ${minRequired})`;
        }
      }
    }

    return null;
  });

  canAddToOrder = computed(() => this.blockingReason() === null);

  // Live Totals
  modalBaseTotal = computed(() => {
    const p = this.product();
    if (!p) return 0;
    const variants = this.selectedVariants();
    if (variants.length > 0) {
      return variants.reduce((acc, v) => acc + ((Number(v.precio || 0) - Number(v.descuento || 0)) * (Number(v.qty) || 1)), 0);
    }
    return Number(p.precio || 0) - Number(p.descuento || 0);
  });

  modalExtrasTotal = computed(() => {
    return this.selectedModifiers().reduce((acc, m) => {
      return acc + (Number(m.precio || 0) * (Number(m.qty) || 1));
    }, 0);
  });

  modalLiveTotal = computed(() => {
    return this.modalBaseTotal() + this.modalExtrasTotal();
  });

  // UI Navigation
  scrollToSection(index: number) {
    this.activeSectionIndex.set(index);
    const container = this.pagesContainer()?.nativeElement;
    if (!container) return;
    const targetLeft = index * container.clientWidth;
    container.scrollTo({
      left: targetLeft,
      behavior: 'smooth'
    });
  }

  onPagesScroll(event: Event) {
    const container = event.target as HTMLElement;
    if (!container || container.clientWidth === 0) return;
    const scrollLeft = container.scrollLeft;
    const pageIndex = Math.round(scrollLeft / container.clientWidth);
    if (pageIndex !== this.activeSectionIndex() && pageIndex >= 0 && pageIndex < this.sections().length) {
      this.activeSectionIndex.set(pageIndex);
    }
  }

  // Variant Actions
  selectVariant(variant: any) {
    if (variant.disponible === false) return;
    this.selectedVariants.set([{ ...variant, qty: 1 }]);
    this.selectedVariant.set(variant);
  }

  updateVariantQty(variantId: any, delta: number) {
    const current = this.selectedVariants();
    const index = current.findIndex(v => v.id === variantId);
    if (index >= 0) {
      const updated = [...current];
      updated[index].qty = Math.max(1, updated[index].qty + delta);
      this.selectedVariants.set(updated);
    }
  }

  // Modifier Actions
  toggleModifier(mod: any) {
    const current = this.selectedModifiers();
    const index = current.findIndex(m => m.id === mod.id);
    const cat = mod.modificador_categorias;

    if (index >= 0) {
      if (cat?.tipo_seleccion === 'RADIO' && Boolean(cat?.obligatorio || cat?.min_selections > 0)) {
        this.toastService.show(`"${cat.nombre}" es obligatoria. Selecciona otra opción en su lugar.`, 'warning');
        return;
      }
      this.selectedModifiers.set(current.filter(m => m.id !== mod.id));
      return;
    }

    if (cat?.tipo_seleccion === 'RADIO') {
      const otherCatMods = current.filter(m => {
        const itemCatId = m.modificador_categorias?.id ?? m.categoria_id;
        return String(itemCatId) !== String(cat.id);
      });
      this.selectedModifiers.set([...otherCatMods, { ...mod, qty: 1 }]);
      return;
    }

    if (cat) {
      const selectedInCat = current.filter(m => {
        const itemCatId = m.modificador_categorias?.id ?? m.categoria_id;
        return String(itemCatId) === String(cat.id);
      });
      const currentCatCount = selectedInCat.reduce((acc, m) => acc + (Number(m.qty) || 1), 0);
      const maxAllowed = Number(cat.max_selections ?? 99);

      if (currentCatCount >= maxAllowed) {
        this.toastService.show(
          `Máximo ${maxAllowed} ${maxAllowed === 1 ? 'opción permitida' : 'opciones permitidas'} en "${cat.nombre}"`,
          'warning'
        );
        return;
      }
    }

    this.selectedModifiers.set([...current, { ...mod, qty: 1 }]);
  }

  updateModifierQty(modId: any, delta: number) {
    const current = this.selectedModifiers();
    const index = current.findIndex(m => m.id === modId);
    if (index < 0) return;

    const mod = current[index];
    const cat = mod.modificador_categorias;
    const itemMax = Number(mod.cantidad_maxima || 1);
    const currentQty = Number(mod.qty || 1);

    if (delta > 0) {
      if (currentQty >= itemMax) {
        this.toastService.show(
          `Máximo ${itemMax} ${itemMax === 1 ? 'porción' : 'porciones'} de "${mod.nombre}"`,
          'warning'
        );
        return;
      }

      if (cat) {
        const selectedInCat = current.filter(m => {
          const itemCatId = m.modificador_categorias?.id ?? m.categoria_id;
          return String(itemCatId) === String(cat.id);
        });
        const totalCatQty = selectedInCat.reduce((acc, m) => acc + (Number(m.qty) || 1), 0);
        const catMax = Number(cat.max_selections ?? 99);
        if (totalCatQty >= catMax) {
          this.toastService.show(
            `Límite máximo de la categoría "${cat.nombre}" alcanzado (${catMax})`,
            'warning'
          );
          return;
        }
      }
    }

    const updated = [...current];
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      if (cat?.tipo_seleccion === 'RADIO' && Boolean(cat?.obligatorio || cat?.min_selections > 0)) {
        this.toastService.show(`"${cat.nombre}" es obligatoria.`, 'warning');
        return;
      }
      this.selectedModifiers.set(current.filter(m => m.id !== modId));
      return;
    }

    updated[index].qty = Math.min(itemMax, newQty);
    this.selectedModifiers.set(updated);
  }

  // Notes
  toggleQuickNote(chip: string) {
    const current = (this.productNote() || '').trim();
    if (!current) {
      this.productNote.set(chip);
      return;
    }

    const parts = current.split(',').map(s => s.trim()).filter(Boolean);
    const existingIndex = parts.findIndex(p => p.toLowerCase() === chip.toLowerCase());

    if (existingIndex >= 0) {
      parts.splice(existingIndex, 1);
      this.productNote.set(parts.join(', '));
    } else {
      parts.push(chip);
      this.productNote.set(parts.join(', '));
    }
  }

  // Submission
  onConfirm() {
    if (!this.canAddToOrder()) return;

    const p = this.product();
    const variants = this.selectedVariants();
    const variant = this.selectedVariant();
    const mods = this.selectedModifiers().map(m => ({
      modificador_id: m.id,
      nombre_modificador: m.nombre,
      cantidad: Number(m.qty || 1),
      precio_unitario: Number(m.precio || 0)
    }));

    this.confirmed.emit({
      product: p,
      variants,
      variant,
      modifiers: mods,
      note: this.productNote().trim() || null
    });
  }
}
