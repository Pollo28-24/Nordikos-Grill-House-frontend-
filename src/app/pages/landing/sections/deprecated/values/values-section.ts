import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';

interface ValueItem {
  icon: string;
  title: string;
  desc: string;
}

@Component({
  selector: 'app-values-section',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './values-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ValuesSection {
  valores: ValueItem[] = [
    { icon: '🤝', title: 'Compromiso', desc: 'Con el desarrollo sustentable y la satisfacción absoluta de nuestros comensales.' },
    { icon: '🌱', title: 'Sustentabilidad', desc: 'Apoyando la ganadería responsable y utilizando vegetales e insumos frescos locales.' },
    { icon: '🍳', title: 'Tradición', desc: 'Manteniendo con orgullo procesos tradicionales de cocina hechos a mano desde el origen.' },
    { icon: '🌟', title: 'Excelencia', desc: 'Calidad superior indiscutible en cada ingrediente, bocado, detalle y atención.' }
  ];
}
