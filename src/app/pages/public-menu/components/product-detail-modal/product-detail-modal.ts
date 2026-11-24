import { Component, input, output, inject, OnInit, OnDestroy, effect, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product, CartCustomization } from '@core/models/product.model';
import { OverlayLockService } from '@core/services/overlay-lock.service';
import { CustomizationStore } from './store/customization.store';
import { ModalHeroHeaderComponent } from './components/modal-hero-header/modal-hero-header';
import { SectionTabsNavComponent } from './components/section-tabs-nav/section-tabs-nav';
import { SectionCarouselComponent } from './components/section-carousel/section-carousel';
import { ModalFooterActionComponent } from './components/modal-footer-action/modal-footer-action';
import { ProductDetailModalHistoryService } from './utils/modal-history.service';

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
  private modalHistory = inject(ProductDetailModalHistoryService);
  private historyToken: string | null = null;

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

    // Coordinar historial del navegador de forma segura ante SSR y carreras A -> B
    this.historyToken = this.modalHistory.open(() => this.onClose.emit());
  }

  requestClose(): void {
    if (this.historyToken) {
      this.modalHistory.requestClose(this.historyToken);
    } else {
      this.onClose.emit();
    }
  }

  ngOnDestroy(): void {
    // Liberar el bloqueo del body
    this.overlayLock.unlock();

    // Limpiar entrada de historial solo si el navegador sigue en el estado de esta instancia
    this.modalHistory.destroy(this.historyToken);
    this.historyToken = null;
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
