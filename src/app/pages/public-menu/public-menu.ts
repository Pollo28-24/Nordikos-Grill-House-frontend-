import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CategoriesService } from '@core/services/categories.service';
import { ProductsService } from '@core/services/products.service';
import { PublicCartService } from '@core/services/public-cart.service';
import { PublicCart } from './components/public-cart/public-cart';
import { PublicHeader } from './components/public-header/public-header';
import { CategoryNav } from './components/category-nav/category-nav';
import { ProductCard } from './components/product-card/product-card';
import { ProductDetailModal } from './components/product-detail-modal/product-detail-modal';
import { PublicCheckout } from './components/public-checkout/public-checkout';
import { Product } from '@core/models/product.model';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';

@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    PublicCart,
    PublicHeader,
    CategoryNav,
    ProductCard,
    ProductDetailModal,
    PublicCheckout,
    CurrencyMxnPipe,
  ],
  templateUrl: './public-menu.html'
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
  cartBumping = signal(false);
  addedProducts = signal<Record<string, boolean>>({});

  // Selection modal state
  selectedProductForDetail = signal<Product | null>(null);

  // Computed filtered products
  filteredProducts = computed(() => {
    let items = this.products();
    const categoryId = this.selectedCategoryId();
    const query = (this.searchQuery() || '').toLowerCase().trim();

    if (categoryId) {
      items = items.filter(p => p.categoria_id === categoryId);
    }

    if (query) {
      const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
      items = items.filter(p => {
        const name = (p.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        const desc = (p.descripcion || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        return name.includes(normalizedQuery) || desc.includes(normalizedQuery);
      });
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
    this.title.setTitle('Menú | Nórdicos Grill House');
    
    this.meta.addTags([
      { name: 'description', content: 'Explora nuestro delicioso menú de Nórdicos Grill House. Hamburguesas, cortes y más con el sabor que te transporta al norte.' },
      { property: 'og:title', content: 'Nórdicos Grill House - Menú Digital' },
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


  getProductsByCategory(categoryId: string | number): Product[] {
    return this.filteredProducts().filter(p => p.categoria_id === categoryId);
  }

  addFromCard(product: Product) {
    this.cartService.addToCart(product);
    this.triggerCartAnimation(product.id);
  }

  addFromModal(event: { product: Product, quantity: number, variants: Record<string, number>, note: string }) {
    const { product, quantity, variants, note } = event;
    let addedAny = false;

    if (product.price_type === 'variants' || (product.variants && product.variants.length > 0)) {
      product.variants?.forEach(v => {
        const qty = variants[v.id] || 0;
        for (let i = 0; i < qty; i++) {
          this.cartService.addToCart(product, v, 1, note);
          addedAny = true;
        }
      });
    } else {
      for (let i = 0; i < quantity; i++) {
        this.cartService.addToCart(product, undefined, 1, note);
        addedAny = true;
      }
    }

    if (addedAny) {
      this.triggerCartAnimation(product.id);
      setTimeout(() => this.closeProductDetail(), 500);
    }
  }

  triggerCartAnimation(productId: string) {
    // Animación del carrito
    this.cartBumping.set(false); // reset if clicked fast
    setTimeout(() => this.cartBumping.set(true), 10);
    setTimeout(() => this.cartBumping.set(false), 400);

    // Feedback en la tarjeta del producto
    this.addedProducts.update(s => ({ ...s, [productId]: true }));
    setTimeout(() => {
      this.addedProducts.update(s => ({ ...s, [productId]: false }));
    }, 1000);
  }

  openProductDetail(product: Product) {
    this.selectedProductForDetail.set(product);
  }

  closeProductDetail() {
    this.selectedProductForDetail.set(null);
  }

  toggleCart() {
    this.isCartOpen.update(v => !v);
  }

  openUserCheckout() {
    this.openCheckout();
  }

  // Modern Checkout component state
  isCheckoutOpen = signal(false);

  openCheckout() {
    this.isCartOpen.set(false);
    this.isCheckoutOpen.set(true);
  }

  closeCheckout() {
    this.isCheckoutOpen.set(false);
  }

  onOrderSubmitted(_event: { request_code: string }) {
    this.cartService.clearCart();
  }
}

