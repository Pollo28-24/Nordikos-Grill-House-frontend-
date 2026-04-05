import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { RouterLink } from '@angular/router';

import { ProductsService } from '../../../../core/services/products.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { CategoriesService } from '../../../../core/services/categories.service';

@Component({
  selector: 'app-new-order-products',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
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
    const s = String(input ?? '').toLowerCase();
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // GROUPS COMPAT
  groups = computed(() => {
    const cats = this.categories();
    const prods = this.products();
    const term = this.normalize(this.searchTerm());

    return cats
      .map((c: any) => ({
        category: c,
        items: prods
          .filter((p: any) => String(p.categoria_id ?? '') === String(c.id))
          .filter((p: any) => p.disponible !== false)
          .filter((p: any) => {
            if (!term) return true;

            const name = this.normalize(p.nombre);
            const desc = this.normalize(p.descripcion);

            return name.includes(term) || desc.includes(term);
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

  // FILTERED PRODUCTS
  filteredProducts = computed(() => {

    const products = this.products();
    const category = this.selectedCategory();
    const term = this.normalize(this.searchTerm());

    return products.filter(p => {

      const matchCategory =
        !category || String(p.categoria_id) === String(category);

      const isAvailable = p.disponible !== false;

      if (!term) return matchCategory && isAvailable;

      const name = this.normalize(p.nombre);
      const desc = this.normalize(p.descripcion);

      const matchSearch =
        name.includes(term) || desc.includes(term);

      return matchCategory && isAvailable && matchSearch;

    });

  });

  // MODAL STATE
  showModal = signal(false);
  selectedProductForModal = signal<any>(null);
  selectedVariant = signal<any>(null);
  selectedVariants = signal<any[]>([]); // New for multi-selection
  selectedModifiers = signal<any[]>([]);
  productNote = signal<string>('');

  // Grouped modifiers for modal
  groupedModifiers = computed(() => {
    const p = this.selectedProductForModal();
    if (!p || !p.modifiers) return [];
    
    // Group modifiers by their category name
    const groups: Record<string, { name: string; items: any[] }> = {};
    
    p.modifiers.forEach((m: any) => {
      // Accessing the category name from the joined table
      // Ensure we look into the nested modificador_categorias object
      const catName = m.modificador_categorias?.nombre || 'Extras opcionales';
      
      if (!groups[catName]) {
        groups[catName] = { name: catName, items: [] };
      }
      groups[catName].items.push(m);
    });
    
    // Convert to array and ensure categories are unique
    return Object.values(groups);
  });

  getProductPrice(p: any): string {
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

  // ACTIONS
  editingOrderId = this.ordersService.editingOrderId;

  onSearchInput(value: string) {
    this.searchTerm.set(value);
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
    this.selectedVariant.set(p.variants?.[0] || null);
    this.selectedVariants.set([]); // Reset multi-selection
    this.selectedModifiers.set([]);
    this.showModal.set(true);
  }

  quickAdd(p: any) {
    if (p.variants && p.variants.length > 0) {
      // If has variants, we can't quick add the base product, 
      // but we could add the first one or just open modal.
      // The user wants click on card to add, let's add first variant or product.
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
  }

  toggleVariant(variant: any) {
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

  confirmModalProduct() {
    const p = this.selectedProductForModal();
    const variants = this.selectedVariants();
    const mods = this.selectedModifiers().map(m => ({
      nombre_modificador: m.nombre,
      cantidad: m.qty,
      precio_unitario: m.precio
    }));

    if (variants.length > 0) {
      // Add each selected variant to cart
      variants.forEach(v => {
        const cartItem: any = {
          variante_id: v.id,
          producto_id: p.id,
          nombre_producto: `${p.nombre} - ${v.nombre}`,
          cantidad: v.qty,
          nota: this.productNote(),
          modificadores: mods
        };
        this.ordersService.cart.update(items => [...items, cartItem]);
      });
    } else {
      // Standard product add
      const v = this.selectedVariant();
      const cartItem: any = {
        producto_id: p.id,
        nombre_producto: v ? `${p.nombre} - ${v.nombre}` : p.nombre,
        cantidad: 1,
        nota: this.productNote(),
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