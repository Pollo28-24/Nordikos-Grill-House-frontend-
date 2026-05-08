import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Product } from '@core/models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './product-card.html',
})
export class ProductCard {
  product = input.required<Product>();
  cartQuantity = input<number>(0);
  isAdded = input<boolean>(false);

  onAdd = output<Product>();
  onViewDetails = output<Product>();

  formatPrice(price: number | null | undefined): string {
    if (price == null) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      currencyDisplay: 'narrowSymbol'
    }).format(price);
  }
}
