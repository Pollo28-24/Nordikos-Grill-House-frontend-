import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Product } from '@core/models/product.model';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CurrencyMxnPipe],
  templateUrl: './product-card.html',
})
export class ProductCard {
  product = input.required<Product>();
  cartQuantity = input<number>(0);
  isAdded = input<boolean>(false);

  onAdd = output<Product>();
  onViewDetails = output<Product>();
}
