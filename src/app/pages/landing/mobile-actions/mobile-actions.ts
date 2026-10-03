import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mobile-actions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './mobile-actions.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MobileActions {
  scrollToLocation(event: Event) {
    event.preventDefault();
    const element = document.getElementById('ubicacion');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
