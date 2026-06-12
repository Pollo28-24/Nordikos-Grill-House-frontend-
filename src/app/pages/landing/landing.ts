import { ChangeDetectionStrategy, Component, HostListener, Inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

// Section Imports
import { HeroSection } from './sections/hero/hero-section';
import { ExperienceSection } from './sections/experience/experience-section';
import { FeaturedSection } from './sections/featured/featured-section';
import { WhyUsSection } from './sections/why-us/why-us-section';
import { AboutSection } from './sections/about/about-section';
import { StatsSection } from './sections/stats/stats-section';
import { GallerySection } from './sections/gallery/gallery-section';
import { TestimonialsSection } from './sections/testimonials/testimonials-section';
import { ValuesSection } from './sections/values/values-section';
import { LocationSection } from './sections/location/location-section';
import { CtaSection } from './sections/cta/cta-section';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    HeroSection,
    ExperienceSection,
    FeaturedSection,
    WhyUsSection,
    AboutSection,
    StatsSection,
    GallerySection,
    TestimonialsSection,
    ValuesSection,
    LocationSection,
    CtaSection
  ],
  templateUrl: './landing.html',
  styles: `
    :host {
      display: block;
      background-color: #0B0B0B;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPage implements OnInit {
  isScrolled = signal<boolean>(false);
  showFloatingCta = signal<boolean>(false);
  mobileMenuOpen = signal<boolean>(false);

  // Lightbox State
  activeImageIndex = signal<number | null>(null);

  images = [
    { url: 'assets/Galeria/iamgen publicidad.jpg', title: 'Hamburguesa Nórdicos' },
    { url: 'assets/Galeria/imagen publicidad 2.jpg', title: 'Cortes Especiales' },
    { url: 'assets/Galeria/iamgen publicidad 3.jpg', title: 'Sabor Artesanal' },
    { url: 'assets/Galeria/iamgen publicidad 4.jpg', title: 'Platillo Signature' },
    { url: 'assets/Galeria/iamgen publicidad 5.jpg', title: 'Del Fuego a tu Mesa' },
    { url: 'assets/Galeria/imagen publicidad 6.jpg', title: 'Acompañamientos Premium' },
    { url: 'assets/Galeria/iamgen publicidad 7.jpg', title: 'El Arte del Carbón' },
    { url: 'assets/Galeria/bebida.jpg', title: 'Bebidas de la Casa' },
    { url: 'assets/Galeria/lcoal.jpg', title: 'Nuestro Local' },
    { url: 'assets/Galeria/local2.jpg', title: 'Espacio Nórdicos' }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {}

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled.set(window.scrollY > 50);
      this.showFloatingCta.set(window.scrollY > 300);
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  scrollToSection(sectionId: string, event: Event) {
    event.preventDefault();
    this.mobileMenuOpen.set(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Lightbox Actions
  openLightbox(index: number) {
    this.activeImageIndex.set(index);
  }

  closeLightbox() {
    this.activeImageIndex.set(null);
  }

  nextImage(event?: Event) {
    if (event) event.stopPropagation();
    const current = this.activeImageIndex();
    if (current !== null) {
      this.activeImageIndex.set((current + 1) % this.images.length);
    }
  }

  prevImage(event?: Event) {
    if (event) event.stopPropagation();
    const current = this.activeImageIndex();
    if (current !== null) {
      this.activeImageIndex.set((current - 1 + this.images.length) % this.images.length);
    }
  }

  // Keyboard navigation for Lightbox
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.activeImageIndex() === null) return;
    
    if (event.key === 'ArrowRight') {
      this.nextImage();
    } else if (event.key === 'ArrowLeft') {
      this.prevImage();
    } else if (event.key === 'Escape') {
      this.closeLightbox();
    }
  }
}
