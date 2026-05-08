import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Product, ProductVariant } from '@core/models/product.model';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './product-detail-modal.html',
})
export class ProductDetailModal {
  product = input.required<Product>();
  isAdded = input<boolean>(false);

  onClose = output<void>();
  onAddToCart = output<{ product: Product, quantity: number, variants: Record<string, number> }>();

  selectedQuantity = signal<number>(1);
  variantQuantities = signal<Record<string, number>>({});

  constructor() {
    effect(() => {
      const p = this.product();
      this.selectedQuantity.set(1);
      
      const initialQuantities: Record<string, number> = {};
      if (p.variants?.length) {
        p.variants.forEach(v => {
          initialQuantities[v.id] = 0;
        });
        initialQuantities[p.variants[0].id] = 1;
      }
      this.variantQuantities.set(initialQuantities);
    }, { allowSignalWrites: true });
  }

  updateSelectedQuantity(amount: number) {
    this.selectedQuantity.update(q => Math.max(1, q + amount));
  }

  updateVariantQuantity(variantId: string, amount: number) {
    this.variantQuantities.update(qs => ({
      ...qs,
      [variantId]: Math.max(0, (qs[variantId] || 0) + amount)
    }));
  }

  hasSelectedVariants(): boolean {
    const quantities = this.variantQuantities();
    return Object.values(quantities).some(q => q > 0);
  }

  getTotal(): number {
    const p = this.product();
    if (p.variants && p.variants.length > 0) {
      const quantities = this.variantQuantities();
      return p.variants?.reduce((acc, v) => acc + ((v.precio - (v.descuento || 0)) * (quantities[v.id] || 0)), 0) || 0;
    }
    return ((p.precio || 0) - (p.descuento || 0)) * this.selectedQuantity();
  }

  formatPrice(price: number | null | undefined): string {
    if (price == null) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      currencyDisplay: 'narrowSymbol'
    }).format(price);
  }

  handleAdd() {
    this.onAddToCart.emit({
      product: this.product(),
      quantity: this.selectedQuantity(),
      variants: this.variantQuantities()
    });
  }
}
