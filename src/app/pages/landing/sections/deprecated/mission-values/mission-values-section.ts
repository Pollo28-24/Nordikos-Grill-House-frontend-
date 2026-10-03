import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-mission-values-section',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './mission-values-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MissionValuesSection {
  valores = [
    { icon: '🤝', title: 'Compromiso', desc: 'Con el desarrollo local y la satisfacción de nuestros comensales.' },
    { icon: '🌱', title: 'Sustentabilidad', desc: 'Apoyando la ganadería responsable y los productos de la región.' },
    { icon: '🏠', title: 'Hospitalidad', desc: 'Un ambiente acogedor y cálido que te hace sentir en familia.' },
    { icon: '🍳', title: 'Tradición', desc: 'Conservando los procesos clásicos de la cocina hecha a mano.' },
    { icon: '🌟', title: 'Excelencia', desc: 'Calidad superior en cada bocado, desde el pan hasta la carne.' }
  ];
}
