import { Injectable, inject, signal, PLATFORM_ID, Renderer2, RendererFactory2 } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

export interface IOverlayLockService {
  lock(): void;
  unlock(): void;
  isLocked(): boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OverlayLockService implements IOverlayLockService {
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private rendererFactory = inject(RendererFactory2);
  private renderer: Renderer2;

  private isBrowser = isPlatformBrowser(this.platformId);
  private lockCount = signal<number>(0);
  private savedScrollY = 0;

  constructor() {
    this.renderer = this.rendererFactory.createRenderer(null, null);
  }

  isLocked(): boolean {
    return this.lockCount() > 0;
  }

  /**
   * Adquiere un bloqueo de scroll.
   * Si es el primer overlay (0 -> 1), captura la posición actual de scroll
   * y fija el body con position: fixed para evitar el rebote elástico en iOS Safari.
   * En llamadas subsecuentes (1 -> 2, etc.), solo incrementa el contador.
   */
  lock(): void {
    if (!this.isBrowser) return;

    const current = this.lockCount();
    this.lockCount.set(current + 1);

    if (current === 0) {
      this.savedScrollY = window.scrollY || this.document.documentElement?.scrollTop || 0;
      this.renderer.setStyle(this.document.body, 'position', 'fixed');
      this.renderer.setStyle(this.document.body, 'top', `-${this.savedScrollY}px`);
      this.renderer.setStyle(this.document.body, 'left', '0');
      this.renderer.setStyle(this.document.body, 'width', '100%');
      this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
      this.renderer.setStyle(this.document.body, 'overscroll-behavior', 'contain');
    }
  }

  /**
   * Libera un bloqueo de scroll.
   * Invariante lockCount >= 0 garantizada (idempotente).
   * Solo cuando el contador llega exactamente a 0, se remueven los estilos
   * y se restaura el scroll previo de la página sin saltos visuales.
   */
  unlock(): void {
    if (!this.isBrowser) return;

    const current = this.lockCount();
    if (current <= 0) return; // Invariante: no permitir valores negativos

    const next = current - 1;
    this.lockCount.set(next);

    if (next === 0) {
      this.renderer.removeStyle(this.document.body, 'position');
      this.renderer.removeStyle(this.document.body, 'top');
      this.renderer.removeStyle(this.document.body, 'left');
      this.renderer.removeStyle(this.document.body, 'width');
      this.renderer.removeStyle(this.document.body, 'overflow');
      this.renderer.removeStyle(this.document.body, 'overscroll-behavior');
      window.scrollTo(0, this.savedScrollY);
    }
  }
}
