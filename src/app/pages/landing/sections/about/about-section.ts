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
export class AboutSection {
  showMission = signal<boolean>(false);
  showVision = signal<boolean>(false);

  toggleMission() {
    this.showMission.update(v => !v);
    if (this.showMission()) this.showVision.set(false);
  }

  toggleVision() {
    this.showVision.update(v => !v);
    if (this.showVision()) this.showMission.set(false);
  }
}
