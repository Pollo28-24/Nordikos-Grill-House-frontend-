import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-experience-section',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './experience-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExperienceSection {
  pilares = [
    {
      step: '01 • EL RITUAL',
      icon: '🔥',
      title: 'Carbón y Madera de Encino',
      desc: 'Brasas vivas de carbón vegetal y leña de encino seleccionada. Cocinamos con paciencia para impregnar cada corte con ese ahumado rústico y profundo que ninguna parrilla a gas puede igualar.'
    },
    {
      step: '02 • EL ORIGEN',
      icon: '🥩',
      title: 'Origen y Calidad Selecta',
      desc: 'Carne de res con marmoleo superior y maduración precisa. Trabajamos con productores responsables para garantizar terneza, jugosidad extrema y vegetales frescos cosechados en Oaxaca.'
    },
    {
      step: '03 • EL ENCUENTRO',
      icon: '🤝',
      title: 'La Mesa Compartida',
      desc: 'Nórdicos nació para ser un punto de reunión. Una atmósfera cálida y sin prisas, diseñada para celebrar momentos memorables, brindar y disfrutar de la comida hecha con el corazón.'
    }
  ];
}
