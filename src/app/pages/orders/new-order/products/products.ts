import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

import { ProductsService } from '../../../../core/services/products.service';
import { OrdersService } from '../../../../core/services/orders.service';
import { CategoriesService } from '../../../../core/services/categories.service';
import { ProductCard } from './components/product-card/product-card';
import {
  ProductCustomizerModal,
  ProductCustomizationResult
} from './components/product-customizer-modal/product-customizer-modal';

@Component({
  selector: 'app-new-order-products',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    ProductCard,
    ProductCustomizerModal
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './products.html',
  host: {
    class: 'flex-1 flex flex-col h-full min-h-0 overflow-hidden'
  }
})
export class NewOrderProducts {
  private productsService = inject(ProductsService);
  private ordersService = inject(OrdersService);
  private categoriesService = inject(CategoriesService);

  // DATA
  products = this.productsService.products;
  categories = this.categoriesService.visibleCategories;
  cart = this.ordersService.cart;
  editingOrderId = this.ordersService.editingOrderId;

  // UI STATE
  searchTerm = signal('');
  selectedCategory = signal<number | string | null>(null);
  loadingProducts = computed(() => this.products().length === 0);

  // MODAL STATE
  showModal = signal(false);
  selectedProductForModal = signal<any>(null);

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
        if (tw.includes(qw)) return true;
        if (qw.length < 3) return false;

        const threshold = qw.length <= 4 ? 1 : 2;
        const distStart = this.levenshtein(qw, tw.substring(0, qw.length + 1));
        if (distStart <= threshold) return true;

        const distFull = this.levenshtein(qw, tw);
        return distFull <= threshold;
      });
    });
  }

  // PRE-NORMALIZED PRODUCTS
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

  // ACTIONS
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

  openProduct(p: any, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedProductForModal.set(p);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedProductForModal.set(null);
  }

  private generateTempId(): string {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }

  onProductCustomizationConfirmed(result: ProductCustomizationResult) {
    const { product: p, variants, variant, modifiers: mods, note: itemNote } = result;

    if (variants && variants.length > 0) {
      variants.forEach(v => {
        const cartItem: any = {
          tempId: this.generateTempId(),
          variante_id: v.id,
          producto_id: p.id,
          nombre_producto: `${p.nombre} - ${v.nombre}`,
          cantidad: Number(v.qty || 1),
          nota: itemNote,
          modificadores: mods
        };
        this.ordersService.cart.update(items => [...items, cartItem]);
      });
    } else {
      const cartItem: any = {
        tempId: this.generateTempId(),
        producto_id: p.id,
        nombre_producto: variant ? `${p.nombre} - ${variant.nombre}` : p.nombre,
        cantidad: 1,
        nota: itemNote,
        modificadores: mods
      };
      if (variant) cartItem.variante_id = variant.id;
      this.ordersService.cart.update(items => [...items, cartItem]);
    }

    this.closeModal();
  }

  getQty(productId: number | string): number {
    const id = String(productId);
    const items = this.cart();
    const prods = this.products();

    const p = prods.find(pp => String(pp.id) === id);
    const variantIds = (p?.variants ?? []).map((v: any) => String(v.id));

    return items.reduce((acc: number, it: any) => {
      if (String(it.producto_id ?? '') === id) {
        return acc + Number(it.cantidad ?? 0);
      }
      if (variantIds.includes(String(it.variante_id ?? ''))) {
        return acc + Number(it.cantidad ?? 0);
      }
      return acc;
    }, 0);
  }
}
