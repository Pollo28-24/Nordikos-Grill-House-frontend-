import { ChangeDetectionStrategy, Component, ElementRef, Inject, OnInit, PLATFORM_ID, ViewChild, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface StatItem {
  target: number;
  current: number;
  prefix: string;
  suffix: string;
  label: string;
  decimalPlaces: number;
}

@Component({
  selector: 'app-stats-section',
  standalone: true,
  templateUrl: './stats-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatsSection implements OnInit {
  @ViewChild('statsContainer', { static: true }) statsContainer!: ElementRef;

  stats = signal<StatItem[]>([
    { target: 5000, current: 0, prefix: '+', suffix: '', label: 'Clientes Satisfechos', decimalPlaces: 0 },
    { target: 100, current: 0, prefix: '+', suffix: '', label: 'Platillos Semanales', decimalPlaces: 0 },
    { target: 4.9, current: 0, prefix: '', suffix: ' ★', label: 'Calificación Promedio', decimalPlaces: 1 },
    { target: 10, current: 0, prefix: '+', suffix: '', label: 'Años de Experiencia', decimalPlaces: 0 }
  ]);

  private animated = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.stats.update(items => items.map(item => ({ ...item, current: item.target })));
      return;
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.animated) {
          this.animated = true;
          this.animateCounters();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    observer.observe(this.statsContainer.nativeElement);
  }

  private animateCounters() {
    const duration = 2000;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);

      this.stats.update(items => 
        items.map(item => {
          const currentVal = ease * item.target;
          return {
            ...item,
            current: parseFloat(currentVal.toFixed(item.decimalPlaces))
          };
        })
      );

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        this.stats.update(items => 
          items.map(item => ({ ...item, current: item.target }))
        );
      }
    };

    requestAnimationFrame(update);
  }
}
