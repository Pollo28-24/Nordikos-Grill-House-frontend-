import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CategoriesService } from '@core/services/categories.service';
import { ProductsService } from '@core/services/products.service';
import { PublicCartService } from '@core/services/public-cart.service';
import { OrdersRequestsService } from '@core/services/orders-requests.service';
import { OrdersRequestsApi } from '@core/api/orders-requests.api';
import { ToastService } from '@core/services/toast.service';
import { PublicCart } from './components/public-cart/public-cart';
import { PublicHeader } from './components/public-header/public-header';
import { CategoryNav } from './components/category-nav/category-nav';
import { ProductCard } from './components/product-card/product-card';
import { ProductDetailModal } from './components/product-detail-modal/product-detail-modal';
import { Product, ProductVariant } from '@core/models/product.model';
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
    CurrencyMxnPipe,
  ],
  templateUrl: './public-menu.html'
})
export class PublicMenu implements OnInit {
  public categoriesService = inject(CategoriesService);
  public productsService = inject(ProductsService);
  public cartService = inject(PublicCartService);
  private requestsService = inject(OrdersRequestsService);
  private requestsApi = inject(OrdersRequestsApi);
  private toastService = inject(ToastService);
  private meta = inject(Meta);
  private title = inject(Title);

  private readonly CHECKOUT_STORAGE_KEY = 'nordikos_checkout_form';

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
    // Load persisted checkout form
    this.loadCheckoutForm();
    // Load service types
    this.loadServiceTypes();
    // Force a reload when visiting the public menu to ensure fresh data
    this.categoriesService.reload();
    this.productsService.reload();
  }

  async loadServiceTypes() {
    if (this.serviceTypes().length === 0) {
      try {
        const { data: types, error: typesError } = await this.requestsApi.getServiceTypes();
        
        if (!typesError && types) {
          this.serviceTypes.set(types);
          if (types.length > 0 && !this.checkoutForm().tipo_servicio_id) {
            this.checkoutForm.update(f => ({ ...f, tipo_servicio_id: types[0].id }));
          }
        }
      } catch (err) {
        this.toastService.show('Error al cargar tipos de servicio', 'error');
      }
    }
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

  private loadCheckoutForm() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(this.CHECKOUT_STORAGE_KEY);
      if (saved) {
        try {
          const savedForm = JSON.parse(saved);
          this.checkoutForm.set({
            nombre: savedForm.nombre || '',
            telefono: savedForm.telefono || '',
            email: savedForm.email || '',
            direccion: savedForm.direccion || '',
            tipo_servicio_id: savedForm.tipo_servicio_id || null,
            numero_mesa: savedForm.numero_mesa || '',
            direccion_entrega: savedForm.direccion_entrega || '',
            nota_general: savedForm.nota_general || ''
          });
        } catch (e) {
          console.error('Error loading checkout form from storage', e);
        }
      }
    }
  }

  private saveCheckoutForm() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.CHECKOUT_STORAGE_KEY, JSON.stringify(this.checkoutForm()));
    }
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
    this.isCartOpen.set(false);
    this.isCheckoutModalOpen.set(true);
  }

  // Checkout modal signals
  isCheckoutModalOpen = signal(false);
  isSuccessModalOpen = signal(false);
  isSubmitting = signal(false);
  successRequestCode = signal('');

  checkoutForm = signal({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    tipo_servicio_id: null as number | null,
    numero_mesa: '',
    direccion_entrega: '',
    nota_general: ''
  });

  serviceTypes = signal<{ id: number; nombre: string }[]>([]);

  async openCheckout() {
    this.isCartOpen.set(false);
    this.isCheckoutModalOpen.set(true);
    await this.loadServiceTypes();
  }

  closeCheckout() {
    this.isCheckoutModalOpen.set(false);
    this.saveCheckoutForm();
  }

  isMesaSelected(): boolean {
    const selectedId = this.checkoutForm().tipo_servicio_id;
    const selected = this.serviceTypes().find(t => t.id === selectedId);
    return !!selected && selected.nombre.toLowerCase().includes('mesa');
  }

  isDomicilioSelected(): boolean {
    const selectedId = this.checkoutForm().tipo_servicio_id;
    const selected = this.serviceTypes().find(t => t.id === selectedId);
    return !!selected && (selected.nombre.toLowerCase().includes('domicilio') || selected.nombre.toLowerCase().includes('delivery'));
  }

  async submitRequest() {
    const form = this.checkoutForm();
    if (!form.nombre.trim() || !form.telefono.trim()) {
      this.toastService.show('Por favor ingresa tu nombre y teléfono.', 'error');
      return;
    }

    if (this.isMesaSelected() && !form.numero_mesa?.trim()) {
      this.toastService.show('Por favor ingresa el número de tu mesa.', 'error');
      return;
    }

    if (this.isDomicilioSelected() && !form.direccion_entrega?.trim()) {
      this.toastService.show('Por favor ingresa tu dirección de entrega.', 'error');
      return;
    }

    if (!form.tipo_servicio_id) {
      this.toastService.show('Por favor selecciona un tipo de servicio.', 'error');
      return;
    }

    try {
      this.isSubmitting.set(true);
      const res = await this.requestsService.submitRequest({
        clientInfo: {
          nombre: form.nombre.trim(),
          telefono: form.telefono.trim(),
          email: form.email.trim() || undefined,
          direccion: this.isDomicilioSelected() ? form.direccion_entrega.trim() : undefined
        },
        tipo_servicio_id: form.tipo_servicio_id,
        numero_mesa: this.isMesaSelected() ? form.numero_mesa.trim() : null,
        direccion_entrega: this.isDomicilioSelected() ? form.direccion_entrega.trim() : null,
        nota_general: form.nota_general.trim() || null,
        items: this.cartService.items()
      });

      if (res.success) {
        // Save the form data to localStorage before clearing the cart and modal
        this.saveCheckoutForm();
        this.toastService.show(`¡Pedido enviado al mesero!`, 'success');
        this.cartService.clearCart();
        this.isCheckoutModalOpen.set(false);
        this.successRequestCode.set(res.request_code || '');
        this.isSuccessModalOpen.set(true);
      } else {
        this.toastService.show(res.error || 'Error al enviar la solicitud', 'error');
      }
    } catch (err: any) {
      this.toastService.show('Error al procesar el pedido', 'error');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  closeSuccessModal() {
    this.isSuccessModalOpen.set(false);
  }
}
