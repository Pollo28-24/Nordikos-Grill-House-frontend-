import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-about-section',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './about-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutSection {}
