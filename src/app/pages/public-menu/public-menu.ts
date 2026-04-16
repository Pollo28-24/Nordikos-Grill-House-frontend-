import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { LucideAngularModule } from 'lucide-angular';
import { CategoriesService } from '@core/services/categories.service';
import { ProductsService } from '@core/services/products.service';
import { PublicCartService } from '@core/services/public-cart.service';
import { PublicCart } from './components/public-cart/public-cart';
import { Product, ProductVariant } from '@core/models/product.model';

@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PublicCart],
  templateUrl: './public-menu.html',
  styles: [`
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class PublicMenu implements OnInit {
  public categoriesService = inject(CategoriesService);
  public productsService = inject(ProductsService);
  public cartService = inject(PublicCartService);
  private meta = inject(Meta);
  private title = inject(Title);

  // Categories and Products from services
  categories = this.categoriesService.visibleCategories;
  products = this.productsService.products;
  loading = computed(() => this.categoriesService.loading() || this.productsService.loading());

  // Error handling for debugging
  error = computed(() => this.categoriesService.error() || this.productsService.error());

  // Local state
  selectedCategoryId = signal<string | null>(null);
  searchQuery = signal('');
  isCartOpen = signal(false);

  // Selection modal state
  selectedProductForDetail = signal<Product | null>(null);
  selectedVariantId = signal<string | null>(null);

  // Computed for selected product details
  selectedProductVariants = computed(() => this.selectedProductForDetail()?.variants ?? []);
  
  selectedVariant = computed(() => {
    const variants = this.selectedProductVariants();
    const id = this.selectedVariantId();
    return variants.find(v => v.id === id) ?? null;
  });

  // Computed filtered products
  filteredProducts = computed(() => {
    let items = this.products();
    const categoryId = this.selectedCategoryId();
    const query = this.searchQuery().toLowerCase();

    if (categoryId) {
      items = items.filter(p => p.categoria_id === categoryId);
    }

    if (query) {
      items = items.filter(p => 
        p.nombre.toLowerCase().includes(query) || 
        p.descripcion?.toLowerCase().includes(query)
      );
    }

    // Only show visible products
    return items.filter(p => p.visible !== false);
  });

  ngOnInit() {
    this.setMetaTags();
    // Force a reload when visiting the public menu to ensure fresh data
    this.categoriesService.reload();
    this.productsService.reload();
  }

  private setMetaTags() {
    this.title.setTitle('Menú | Nordikos Grill House');
    
    this.meta.addTags([
      { name: 'description', content: 'Explora nuestro delicioso menú de Nordikos Grill House. Hamburguesas, cortes y más con el sabor que te transporta al norte.' },
      { property: 'og:title', content: 'Nordikos Grill House - Menú Digital' },
      { property: 'og:description', content: 'Sabor que te transporta al norte. Consulta nuestros platillos y precios en línea.' },
      { property: 'og:image', content: 'https://nordikos-grill-house-frontend.vercel.app/assets/logo/header.webp' },
      { property: 'og:url', content: 'https://nordikos-grill-house-frontend.vercel.app/menu' },
      { name: 'twitter:card', content: 'summary_large_image' }
    ]);
  }

  selectCategory(id: string | null) {
    this.selectedCategoryId.set(id);
  }

  getProductQuantity(productId: string): number {
    return this.cartService.items()
      .filter(item => item.product_id === productId)
      .reduce((acc, item) => acc + item.cantidad, 0);
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  formatPrice(price: number | null | undefined): string {
    if (price == null) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  }

  getProductsByCategory(categoryId: string | number): Product[] {
    return this.filteredProducts().filter(p => p.categoria_id === categoryId);
  }

  addToCart(product: Product, variant?: ProductVariant) {
    this.cartService.addToCart(product, variant);
    if (this.selectedProductForDetail()) {
      this.closeProductDetail();
    }
  }

  openProductDetail(product: Product) {
    this.selectedProductForDetail.set(product);
    if (product.variants?.length) {
      this.selectedVariantId.set(product.variants[0].id);
    }
  }

  closeProductDetail() {
    this.selectedProductForDetail.set(null);
    this.selectedVariantId.set(null);
  }

  selectVariant(variantId: string) {
    this.selectedVariantId.set(variantId);
  }

  toggleCart() {
    this.isCartOpen.update(v => !v);
  }

  checkout() {
    const url = this.cartService.generateWhatsAppMessage();
    if (url) {
      window.open(url, '_blank');
    }
  }
}
