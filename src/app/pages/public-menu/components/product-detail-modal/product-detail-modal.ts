import { Component, input, output, inject, OnInit, OnDestroy, effect, viewChild, HostListener, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Product, CartCustomization } from '@core/models/product.model';
import { OverlayLockService } from '@core/services/overlay-lock.service';
import { CustomizationStore } from './store/customization.store';
import { ModalHeroHeaderComponent } from './components/modal-hero-header/modal-hero-header';
import { SectionTabsNavComponent } from './components/section-tabs-nav/section-tabs-nav';
import { SectionCarouselComponent } from './components/section-carousel/section-carousel';
import { ModalFooterActionComponent } from './components/modal-footer-action/modal-footer-action';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    ModalHeroHeaderComponent,
    SectionTabsNavComponent,
    SectionCarouselComponent,
    ModalFooterActionComponent
  ],
  providers: [CustomizationStore],
  templateUrl: './product-detail-modal.html',
})
export class ProductDetailModal implements OnInit, OnDestroy {
  // Inputs y Outputs públicos preservados para retrocompatibilidad total
  product = input.required<Product>();
  isAdded = input<boolean>(false);

  onClose = output<void>();
  onAddToCart = output<CartCustomization>();

  // Store provisto a nivel de ElementInjector (se destruye con el modal)
  readonly store = inject(CustomizationStore);
  private overlayLock = inject(OverlayLockService);
  private platformId = inject(PLATFORM_ID);
  private hasPushedHistoryState = false;

  readonly carousel = viewChild(SectionCarouselComponent);

  constructor() {
    // Sincronizar el producto entrante con el Store
    effect(() => {
      const p = this.product();
      this.store.init(p);
    });
  }

  ngOnInit(): void {
    // Bloquear el body de forma reentrante y segura ante SSR y Safari iOS
    this.overlayLock.lock();

    // Soporte para botón atrás de Android y gestos del navegador
    if (isPlatformBrowser(this.platformId)) {
      window.history.pushState({ modal: 'product-detail' }, '');
      this.hasPushedHistoryState = true;
    }
  }

  @HostListener('window:popstate')
  onPopState(): void {
    if (this.hasPushedHistoryState) {
      this.hasPushedHistoryState = false;
    }
    this.onClose.emit();
  }

  requestClose(): void {
    if (isPlatformBrowser(this.platformId) && this.hasPushedHistoryState) {
      this.hasPushedHistoryState = false;
      window.history.back();
    } else {
      this.onClose.emit();
    }
  }

  ngOnDestroy(): void {
    // Liberar el bloqueo del body
    this.overlayLock.unlock();

    // Limpiar estado de historial si el modal se destruyó externamente
    if (isPlatformBrowser(this.platformId) && this.hasPushedHistoryState) {
      this.hasPushedHistoryState = false;
      window.history.back();
    }
  }

  handleSectionSelect(index: number): void {
    this.store.setActiveSectionIndex(index);
    this.carousel()?.scrollToSection(index);
  }

  handleAdd(): void {
    const customization = this.store.buildCartCustomization();
    if (customization) {
      // Emitir el Value Object inmutable hacia el carrito
      this.onAddToCart.emit(customization as unknown as CartCustomization);
    }
  }
}
