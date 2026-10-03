import { Component, ChangeDetectionStrategy, inject, input, output, effect, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { ClientOrdersService } from '@core/services/client-orders.service';
import { ClientSubmittedOrder, OrderRequestLocation } from '@core/models/order.model';
import { getGoogleMapsUrl } from '@core/utils/order-location.utils';
import { OverlayLockService } from '@core/services/overlay-lock.service';

@Component({
  selector: 'app-public-orders-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CurrencyMxnPipe],
  templateUrl: './public-orders-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicOrdersModal {
  readonly clientOrdersService = inject(ClientOrdersService);
  private overlayLock = inject(OverlayLockService);
  private destroyRef = inject(DestroyRef);
  private isLockedBySelf = false;

  isOpen = input<boolean>(false);
  close = output<void>();

  constructor() {
    effect(() => {
      const open = this.isOpen();
      if (open && !this.isLockedBySelf) {
        this.overlayLock.lock();
        this.isLockedBySelf = true;
      } else if (!open && this.isLockedBySelf) {
        this.overlayLock.unlock();
        this.isLockedBySelf = false;
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.isLockedBySelf) {
        this.overlayLock.unlock();
        this.isLockedBySelf = false;
      }
    });
  }

  onClose() {
    this.close.emit();
  }

  getRelativeTime(isoDate: string): string {
    try {
      const created = new Date(isoDate).getTime();
      const now = new Date().getTime();
      const diffMs = now - created;
      const diffMins = Math.floor(diffMs / 60000);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins === 1) return 'Hace 1 min';
      if (diffMins < 60) return `Hace ${diffMins} min`;

      const diffHours = Math.floor(diffMins / 60);
      if (diffHours === 1) return 'Hace 1 hora';
      if (diffHours < 24) return `Hace ${diffHours} h`;

      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays} d`;
    } catch {
      return '';
    }
  }

  getMapsUrl(location?: OrderRequestLocation | null, address?: string | null): string | null {
    return getGoogleMapsUrl(location, address);
  }

  getWhatsAppShareUrl(order: ClientSubmittedOrder): string {
    return this.clientOrdersService.getWhatsAppShareUrl(order);
  }
}
