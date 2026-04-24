import { Component, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { PublicCartService } from '../../../../core/services/public-cart.service';

@Component({
  selector: 'app-public-cart',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './public-cart.html',
  styles: [`
    .cart-backdrop {
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }
  `]
})
export class PublicCart {
  public cartService = inject(PublicCartService);
  
  close = output<void>();

  formatPrice(price: number | null | undefined): string {
    if (price == null) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      currencyDisplay: 'narrowSymbol'
    }).format(price);
  }

  checkout() {
    const url = this.cartService.generateWhatsAppMessage();
    if (url) {
      window.open(url, '_blank');
    }
  }

  onClose() {
    this.close.emit();
  }
}
