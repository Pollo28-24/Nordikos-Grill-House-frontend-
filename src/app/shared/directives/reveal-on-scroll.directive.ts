import { Directive, ElementRef, Inject, Input, OnInit, PLATFORM_ID, Renderer2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appRevealOnScroll]',
  standalone: true
})
export class RevealOnScrollDirective implements OnInit {
  @Input() revealDelay = 0; // Delay in milliseconds before animating
  @Input() revealThreshold = 0.1; // Threshold for Intersection Observer
  @Input() revealRootMargin = '0px'; // Root margin for Intersection Observer

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      // For SSR, keep them visible or let the client reveal them.
      // If we don't do anything, the client will see them hide first when JS bootstraps,
      // which is perfect for animations.
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: this.revealRootMargin,
      threshold: this.revealThreshold
    };

    const observer = new IntersectionObserver((entries, self) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (this.revealDelay > 0) {
            setTimeout(() => {
              this.renderer.addClass(this.el.nativeElement, 'revealed');
            }, this.revealDelay);
          } else {
            this.renderer.addClass(this.el.nativeElement, 'revealed');
          }
          self.unobserve(entry.target);
        }
      });
    }, observerOptions);

    observer.observe(this.el.nativeElement);
  }
}
