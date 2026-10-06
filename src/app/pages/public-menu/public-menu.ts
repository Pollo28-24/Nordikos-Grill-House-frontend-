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
import { PublicOrdersModal } from './components/public-orders-modal/public-orders-modal';
import { Product, CartCustomization } from '@core/models/product.model';
import { ActivatedRoute } from '@angular/router';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { ClientOrdersService } from '@core/services/client-orders.service';
import { MenuBackground, MENU_BACKGROUND_ENABLED } from './components/menu-background/menu-background';

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
    PublicOrdersModal,
    CurrencyMxnPipe,
    MenuBackground,
  ],
  templateUrl: './public-menu.html'
})
export class PublicMenu implements OnInit {
  /** Interruptor del fondo "Brasa nocturna" (definido en menu-background.ts). */
  protected readonly bgEnabled = MENU_BACKGROUND_ENABLED;
  public categoriesService = inject(CategoriesService);
  public productsService = inject(ProductsService);
  public cartService = inject(PublicCartService);
  public clientOrdersService = inject(ClientOrdersService);
  private meta = inject(Meta);
  private title = inject(Title);
  private route = inject(ActivatedRoute);

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
      items = items.filter(p => p.categoria_id != null && String(p.categoria_id) === String(categoryId));
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
    
    // Escuchamos reactivamente los queryParams para sincronizar la categoría seleccionada
    this.route.queryParamMap.subscribe(params => {
      const catParam = params.get('categoria');
      this.selectedCategoryId.set(catParam ? String(catParam) : null);
    });

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
      { property: 'og:image', content: 'https://nordikos-grill-house-frontend.vercel.app/assets/header/fondo.jpg' },
      { property: 'og:image:secure_url', content: 'https://nordikos-grill-house-frontend.vercel.app/assets/header/fondo.jpg' },
      { property: 'og:image:type', content: 'image/jpeg' },
      { property: 'og:image:width', content: '1080' },
      { property: 'og:image:height', content: '608' },
      { name: 'twitter:image', content: 'https://nordikos-grill-house-frontend.vercel.app/assets/header/fondo.jpg' },
      { property: 'og:url', content: 'https://nordikos-grill-house-frontend.vercel.app/menu' },
      { name: 'twitter:card', content: 'summary_large_image' }
    ]);
  }

  selectCategory(id: string | number | null) {
    this.selectedCategoryId.set(id != null ? String(id) : null);
  }

  getProductQuantity(productId: string | number): number {
    const targetId = String(productId);
    return this.cartService.items()
      .filter(item => {
        const prodId = String(item.producto_id ?? item.product_id ?? (item as any).product?.id ?? '');
        return prodId === targetId;
      })
      .reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0);
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }


  getProductsByCategory(categoryId: string | number): Product[] {
    return this.filteredProducts().filter(p => p.categoria_id != null && String(p.categoria_id) === String(categoryId));
  }

  addFromCard(product: Product) {
    const defaultVariant = product.variants && product.variants.length > 0 ? product.variants[0] : undefined;
    this.cartService.addToCart(product, defaultVariant);
    this.triggerCartAnimation(product.id);
  }

  addFromModal(customization: CartCustomization) {
    this.cartService.addCustomizedProduct(customization);
    this.triggerCartAnimation(customization.product.id);
    setTimeout(() => this.closeProductDetail(), 500);
  }

  triggerCartAnimation(productId: string | number) {
    const id = String(productId);
    // Animación del carrito
    this.cartBumping.set(false); // reset if clicked fast
    setTimeout(() => this.cartBumping.set(true), 10);
    setTimeout(() => this.cartBumping.set(false), 400);

    // Feedback en la tarjeta del producto
    this.addedProducts.update(s => ({ ...s, [id]: true }));
    setTimeout(() => {
      this.addedProducts.update(s => ({ ...s, [id]: false }));
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

  // Historial de pedidos del cliente
  isOrdersModalOpen = signal(false);

  openCheckout() {
    this.isCartOpen.set(false);
    this.isOrdersModalOpen.set(false);
    this.isCheckoutOpen.set(true);
  }

  closeCheckout() {
    this.isCheckoutOpen.set(false);
  }

  openOrdersModal() {
    this.isCartOpen.set(false);
    this.isCheckoutOpen.set(false);
    this.isOrdersModalOpen.set(true);
  }

  closeOrdersModal() {
    this.isOrdersModalOpen.set(false);
  }

  onOrderSubmitted(_event: { request_code: string }) {
    this.cartService.clearCart();
    this.isCheckoutOpen.set(false);
    this.isOrdersModalOpen.set(true);
  }
}

