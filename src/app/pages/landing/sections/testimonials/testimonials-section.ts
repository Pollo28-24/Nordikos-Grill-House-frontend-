import { ChangeDetectionStrategy, Component, Inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';

interface Testimonial {
  text: string;
  author: string;
  role: string;
  rating: number;
}

@Component({
  selector: 'app-testimonials-section',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './testimonials-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TestimonialsSection implements OnInit, OnDestroy {
  testimonials: Testimonial[] = [
    {
      text: '¡Las mejores hamburguesas artesanales de la región! El pan es sumamente suave y la carne al carbón tiene ese toque ahumado perfecto. El servicio es de primera clase, te hacen sentir en familia.',
      author: 'Juan Carlos Mendoza',
      role: 'Local Guide',
      rating: 5
    },
    {
      text: 'Nórdicos es una experiencia gastronómica que vale la pena repetir. Probé el corte especial Tomahawk y estaba espectacular: término exacto, tierno y con mucho sabor. Excelente ambiente.',
      author: 'Sofía Rodríguez',
      role: 'Cliente Frecuente',
      rating: 5
    },
    {
      text: 'Me encanta el concepto artesanal y el apoyo que brindan a los productores locales. Los ingredientes son fresquísimos y la sazón de las salsas de la casa es incomparable. ¡10 de 10!',
      author: 'Alejandro Toledo',
      role: 'Amante del Foodie',
      rating: 5
    }
  ];

  activeIndex = signal<number>(0);
  private intervalId: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    this.startCarousel();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  startCarousel() {
    if (!isPlatformBrowser(this.platformId)) return;
    
    this.stopCarousel();
    this.intervalId = setInterval(() => {
      this.next();
    }, 5000);
  }

  stopCarousel() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  next() {
    this.activeIndex.update(idx => (idx + 1) % this.testimonials.length);
  }

  prev() {
    this.activeIndex.update(idx => (idx - 1 + this.testimonials.length) % this.testimonials.length);
  }

  setIndex(index: number) {
    this.activeIndex.set(index);
    this.startCarousel(); // Restart timer on manual click
  }
}
