import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TickService implements OnDestroy {
  readonly currentTime = signal(Date.now());
  private timer = setInterval(() => this.currentTime.set(Date.now()), 1000);

  ngOnDestroy() {
    clearInterval(this.timer);
  }
}
