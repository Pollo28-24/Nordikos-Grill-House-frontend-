import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  viewChild,
  ElementRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import { ProductsService } from '../../../../core/services/products.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { CategoriesService } from '../../../../core/services/categories.service';

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

@Component({
  selector: 'app-new-order-products',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html'
})
export class NewOrderProducts {

  private productsService = inject(ProductsService);
  private ordersService = inject(OrdersService);
  private categoriesService = inject(CategoriesService);

  // DATA
  products = this.productsService.products;
  categories = this.categoriesService.visibleCategories;
  cart = this.ordersService.cart;

  // UI STATE
  searchTerm = signal('');
  selectedCategory = signal<number | string | null>(null);

  // loading state (reemplaza @defer placeholder)
  loadingProducts = computed(() => this.products().length === 0);

  // NORMALIZED SEARCH
  private normalize(input: any) {
    const s = String(input ?? '').toLowerCase().trim();
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // ALGORITMO LEVENSHTEIN (Mide diferencia entre palabras)
  private levenshtein(a: string, b: string): number {
    const tmp = [];
    for (let i = 0; i <= a.length; i++) {
      tmp[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
      tmp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        tmp[i][j] = Math.min(
          tmp[i - 1][j] + 1,
          tmp[i][j - 1] + 1,
          tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return tmp[a.length][b.length];
  }

  // BUSQUEDA DIFUSA (Fuzzy Match inteligente con tolerancia a errores de escritura)
  private fuzzySearch(text: string, query: string): boolean {
    const qWords = query.split(/\s+/).filter(w => w.length > 0);
    if (qWords.length === 0) return true;

    const tWords = text.split(/\s+/).filter(w => w.length > 0);

    return qWords.every(qw => {
      return tWords.some(tw => {
        // Coincidencia exacta de subcadena (ej: "pap" en "papas")
        if (tw.includes(qw)) return true;
        // Palabras muy cortas (< 3 letras) no permiten búsqueda difusa para evitar falsos positivos
        if (qw.length < 3) return false;

        // Tolerancia dinámica según longitud de palabra
        const threshold = qw.length <= 4 ? 1 : 2;
        
        // Compara inicio de palabra o palabra completa con Levenshtein
        const distStart = this.levenshtein(qw, tw.substring(0, qw.length + 1));
        if (distStart <= threshold) return true;

        const distFull = this.levenshtein(qw, tw);
        return distFull <= threshold;
      });
    });
  }

  // PRE-NORMALIZED PRODUCTS (Calculado solo cuando cambia la lista de productos)
  normalizedProducts = computed(() => {
    return this.products().map((p: any) => ({
      ...p,
      _normalizedName: this.normalize(p.nombre),
      _normalizedDesc: this.normalize(p.descripcion)
    }));
  });

  // GROUPS COMPAT (Búsqueda ultra-eficiente e inteligente)
  groups = computed(() => {
    const cats = this.categories();
    const prods = this.normalizedProducts();
    const term = this.normalize(this.searchTerm());
    const selectedCat = this.selectedCategory();

    // Si hay búsqueda, ignoramos la categoría para buscar globalmente
    const effectiveCat = term ? null : selectedCat;

    return cats
      .filter(c => !effectiveCat || String(c.id) === String(effectiveCat))
      .map((c: any) => ({
        category: c,
        items: prods
          .filter((p: any) => String(p.categoria_id ?? '') === String(c.id))
          .filter((p: any) => {
            if (!term) return true;
            const fullText = `${p._normalizedName} ${p._normalizedDesc}`;
            return this.fuzzySearch(fullText, term);
          })
      }))
      .filter((g: any) => g.items.length > 0);
  });

  // Collapsed state per category
  collapsed = signal<Record<string, boolean>>({});

  isCollapsed(id: number | string) {
    const key = String(id);
    return !!this.collapsed()[key];
  }

  toggleCollapsed(id: number | string) {
    const key = String(id);
    const next = { ...this.collapsed() };
    next[key] = !next[key];
    this.collapsed.set(next);
  }

  // FILTERED PRODUCTS (Búsqueda ultra-eficiente e inteligente)
  filteredProducts = computed(() => {
    const products = this.normalizedProducts();
    const category = this.selectedCategory();
    const term = this.normalize(this.searchTerm());

    // Si hay búsqueda, ignoramos la categoría para buscar globalmente
    const effectiveCat = term ? null : category;

    return products.filter(p => {
      const matchCategory =
        !effectiveCat || String(p.categoria_id) === String(effectiveCat);

      if (!term) return matchCategory;

      const fullText = `${p._normalizedName} ${p._normalizedDesc}`;
      return matchCategory && this.fuzzySearch(fullText, term);
    });
  });

  // MODAL STATE
  showModal = signal(false);
  selectedProductForModal = signal<any>(null);
  selectedVariant = signal<any>(null);
  selectedVariants = signal<any[]>([]); // Variant selections with qty
  selectedModifiers = signal<any[]>([]);
  productNote = signal<string>('');
  activeSectionIndex = signal<number>(0);

  readonly pagesContainer = viewChild<ElementRef<HTMLDivElement>>('pagesContainer');

  // Grouped modifiers for modal
  groupedModifiers = computed(() => {
    const p = this.selectedProductForModal();
    if (!p || !p.modifiers) return [];
    
    // Group modifiers by their category name
    const groups: Record<string, { name: string; items: any[] }> = {};
    
    p.modifiers.forEach((m: any) => {
      const catName = m.modificador_categorias?.nombre || 'Extras opcionales';
      
      if (!groups[catName]) {
        groups[catName] = { name: catName, items: [] };
      }
      groups[catName].items.push(m);
    });
    
    // Convert to array and ensure categories are unique
    return Object.values(groups);
  });

  // Dynamic sections with status for navigation & pages
  sections = computed<ModalSection[]>(() => {
    const p = this.selectedProductForModal();
    if (!p) return [];

    const list: ModalSection[] = [];

    // 1. Variantes (si el producto tiene variantes)
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
      list.push({
        id: `mod-group-${idx}`,
        title: group.name,
        type: 'modifier-group',
        isRequired: false,
        isComplete: count > 0,
        count,
        badge: count > 0 ? `✓ (${count})` : '0',
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

  // Semantic validation: Can add to order?
  canAddToOrder = computed(() => {
    const p = this.selectedProductForModal();
    if (!p) return false;

    // Si el producto tiene variantes, exige al menos 1 variante disponible seleccionada
    if (p.variants && p.variants.length > 0) {
      const selected = this.selectedVariants();
      if (selected.length === 0) return false;
      return selected.some(sv =>
        p.variants.some((pv: any) => pv.id === sv.id && pv.disponible !== false)
      );
    }

    // Producto simple: siempre válido
    return true;
  });

  // Real-time live totals
  modalBaseTotal = computed(() => {
    const p = this.selectedProductForModal();
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

  getProductPriceOriginal(p: any): string {
    const hasVariants = p.variants && p.variants.length > 0;
    if (hasVariants && (p.price_type === 'variants' || !p.precio || p.precio === 0)) {
      const prices = p.variants.map((v: any) => Number(v.precio || 0));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === max) return `$${min}`;
      return `Desde $${min}`;
    }
    return `$${p.precio || 0}`;
  }

  getProductPrice(p: any): string {
    const hasVariants = p.variants && p.variants.length > 0;
    
    if (hasVariants && (p.price_type === 'variants' || !p.precio || p.precio === 0)) {
      const prices = p.variants.map((v: any) => Number((v.precio || 0) - (v.descuento || 0)));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === max) return `$${min}`;
      return `Desde $${min}`;
    }
    
    return `$${(p.precio || 0) - (p.descuento || 0)}`;
  }

  // ACTIONS
  editingOrderId = this.ordersService.editingOrderId;

  private searchTimeout: any;

  onSearchInput(value: string) {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (!value) {
      this.searchTerm.set('');
      return;
    }
    this.searchTimeout = setTimeout(() => {
      this.searchTerm.set(value);
    }, 150);
  }

  selectCategory(id: number | string | null) {
    this.selectedCategory.set(id);
  }

  addProduct(product: any) {
    this.ordersService.addProduct(product);
  }

  addVariant(variant: any, product: any) {
    this.ordersService.addVariant(variant, product);
  }

  openProduct(p: any, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.productNote.set('');
    this.selectedProductForModal.set(p);
    this.activeSectionIndex.set(0);

    // Preseleccionar la primera variante disponible si tiene opciones
    const firstAvailable = p.variants?.find((v: any) => v.disponible !== false);
    if (firstAvailable) {
      this.selectedVariants.set([{ ...firstAvailable, qty: 1 }]);
      this.selectedVariant.set(firstAvailable);
    } else {
      this.selectedVariants.set([]);
      this.selectedVariant.set(null);
    }

    this.selectedModifiers.set([]);
    this.showModal.set(true);

    setTimeout(() => {
      const container = this.pagesContainer()?.nativeElement;
      if (container) {
        container.scrollLeft = 0;
      }
    }, 50);
  }

  hasOptions(p: any): boolean {
    const hasVariants = !!(p?.variants && p.variants.length > 0);
    const hasModifiers = !!(p?.modifiers && p.modifiers.length > 0);
    return hasVariants || hasModifiers;
  }

  quickAdd(p: any, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    if (p.variants && p.variants.length > 0) {
      const firstVariant = p.variants[0];
      this.addVariant(firstVariant, p);
    } else {
      this.addProduct(p);
    }
  }

  quickAddVariant(variant: any, product: any, event: MouseEvent) {
    event.stopPropagation();
    this.ordersService.addVariant(variant, product);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedProductForModal.set(null);
    this.selectedVariant.set(null);
    this.selectedVariants.set([]);
    this.selectedModifiers.set([]);
    this.productNote.set('');
    this.activeSectionIndex.set(0);
  }

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

  selectVariant(variant: any) {
    if (variant.disponible === false) return;
    this.selectedVariants.set([{ ...variant, qty: 1 }]);
    this.selectedVariant.set(variant);
  }

  toggleVariant(variant: any) {
    if (variant.disponible === false) return;
    const current = this.selectedVariants();
    const index = current.findIndex(v => v.id === variant.id);
    if (index >= 0) {
      this.selectedVariants.set(current.filter(v => v.id !== variant.id));
    } else {
      this.selectedVariants.set([...current, { ...variant, qty: 1 }]);
    }
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

  isVariantSelected(variantId: any) {
    return this.selectedVariants().some(v => v.id === variantId);
  }

  getVariantQty(variantId: any): number {
    const v = this.selectedVariants().find(sv => sv.id === variantId);
    return v ? v.qty : 0;
  }

  toggleModifier(mod: any) {
    const current = this.selectedModifiers();
    const index = current.findIndex(m => m.id === mod.id);
    if (index >= 0) {
      this.selectedModifiers.set(current.filter(m => m.id !== mod.id));
    } else {
      this.selectedModifiers.set([...current, { ...mod, qty: 1 }]);
    }
  }

  updateModifierQty(modId: any, delta: number) {
    const current = this.selectedModifiers();
    const index = current.findIndex(m => m.id === modId);
    if (index >= 0) {
      const updated = [...current];
      const max = updated[index].cantidad_maxima || 99;
      updated[index].qty = Math.min(max, Math.max(1, updated[index].qty + delta));
      this.selectedModifiers.set(updated);
    }
  }

  isModifierSelected(modId: any) {
    return this.selectedModifiers().some(m => m.id === modId);
  }

  getModifierQty(modId: any): number {
    const m = this.selectedModifiers().find(sm => sm.id === modId);
    return m ? m.qty : 0;
  }

  readonly quickNotes: string[] = [
    'Sin cebolla',
    'Sin catsup',
    'Sin tomate',
    'Sin pepinillos',
    'Sin lechuga',
    'Sin mostaza',
    'Sin aderezo',
    'Sin ningún tipo de aderezo',
    'Sin verdura',
    'Sin queso amarillo',
    'Sin queso manchego',
    'Sin chile'
  ];

  isQuickNoteSelected(chip: string): boolean {
    const note = (this.productNote() || '').toLowerCase();
    return note.includes(chip.toLowerCase());
  }

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

  addQuickNote(chip: string) {
    this.toggleQuickNote(chip);
  }

  private generateTempId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }

  confirmModalProduct() {
    if (!this.canAddToOrder()) return;

    const p = this.selectedProductForModal();
    const variants = this.selectedVariants();
    const mods = this.selectedModifiers().map(m => ({
      modificador_id: m.id,
      nombre_modificador: m.nombre,
      cantidad: Number(m.qty || 1),
      precio_unitario: Number(m.precio || 0)
    }));

    if (variants.length > 0) {
      // Add each selected variant to cart with unique tempId
      variants.forEach(v => {
        const cartItem: any = {
          tempId: this.generateTempId(),
          variante_id: v.id,
          producto_id: p.id,
          nombre_producto: `${p.nombre} - ${v.nombre}`,
          cantidad: Number(v.qty || 1),
          nota: this.productNote().trim() || null,
          modificadores: mods
        };
        this.ordersService.cart.update(items => [...items, cartItem]);
      });
    } else {
      // Standard product add with unique tempId
      const v = this.selectedVariant();
      const cartItem: any = {
        tempId: this.generateTempId(),
        producto_id: p.id,
        nombre_producto: v ? `${p.nombre} - ${v.nombre}` : p.nombre,
        cantidad: 1,
        nota: this.productNote().trim() || null,
        modificadores: mods
      };
      if (v) cartItem.variante_id = v.id;
      this.ordersService.cart.update(items => [...items, cartItem]);
    }

    this.closeModal();
  }

  getQty(productId: number | string): number {

    const id = String(productId);
    const items = this.cart();
    const prods = this.products();

    const p = prods.find(pp => String(pp.id) === id);

    const variantIds =
      (p?.variants ?? []).map((v: any) => String(v.id));

    return items.reduce((acc: number, it: any) => {

      if (String(it.producto_id ?? '') === id)
        return acc + Number(it.cantidad ?? 0);

      if (variantIds.includes(String(it.variante_id ?? '')))
        return acc + Number(it.cantidad ?? 0);

      return acc;

    }, 0);

  }

}
