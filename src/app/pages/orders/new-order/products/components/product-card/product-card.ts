import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-card.html'
})
export class ProductCard {
  readonly product = input.required<any>();
  readonly cartQuantity = input<number>(0);

  readonly select = output<MouseEvent>();
  readonly customize = output<MouseEvent>();

  getProductPrice(p: any): string {
    const hasVariants = p.variants && p.variants.length > 0;
    
    if (hasVariants && (p.price_type === 'variants' || !p.precio || p.precio === 0)) {
      const prices = p.variants.map((v: any) => Number((v.precio || 0) - (v.descuento || 0)));
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === max) return `$${min}`;
      return `Desde $${min}`;
    }
    
    return `$${(p.precio || 0) - (p.descuento || 0)}`;
  }
}
