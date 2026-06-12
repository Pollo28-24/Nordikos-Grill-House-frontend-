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
      icon: '🔥',
      title: 'Brasas Auténticas',
      desc: 'El encanto del carbón vegetal y madera de encino seleccionada que impregna a nuestros ingredientes de un ahumado artesanal incomparable.'
    },
    {
      icon: '🥩',
      title: 'Cortes Seleccionados',
      desc: 'Carne proveniente de productores sustentables, con un marmoleo ideal y maduración precisa para asegurar jugosidad extrema.'
    },
    {
      icon: '🍷',
      title: 'Ambiente Acogedor',
      desc: 'Un espacio íntimo y refinado que combina calidez de hogar con la mística del fuego para crear veladas memorables con los tuyos.'
    },
    {
      icon: '⭐',
      title: 'Servicio Excepcional',
      desc: 'Atención personalizada y atenta enfocada en que te sientas como el invitado de honor en cada una de tus visitas.'
    }
  ];
}
