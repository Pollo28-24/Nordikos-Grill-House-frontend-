import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-location-section',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './location-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationSection {
  address = 'Cerca de Las Flores De Moni, C. Zaragoza 26, Barrio de la Soledad, 71265 San Pablo Huixtepec, Oax.';
  phone = '+52 1 951 222 4034';
  
  openGoogleMaps() {
    const query = encodeURIComponent('C. Zaragoza 26, Barrio de la Soledad, 71265 San Pablo Huixtepec, Oax.');
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  }

  openWhatsApp() {
    const formattedPhone = '5219512224034';
    const text = encodeURIComponent('¡Hola Nórdicos! Me gustaría pedir información/hacer un pedido.');
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  }
}
