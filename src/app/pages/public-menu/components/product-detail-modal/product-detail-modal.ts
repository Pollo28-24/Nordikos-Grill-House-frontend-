import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { Product, ProductVariant } from '@core/models/product.model';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, CurrencyMxnPipe],
  templateUrl: './product-detail-modal.html',
})
export class ProductDetailModal {
  product = input.required<Product>();
  isAdded = input<boolean>(false);

  onClose = output<void>();
  onAddToCart = output<{ product: Product, quantity: number, variants: Record<string, number>, note: string }>();

  selectedQuantity = signal<number>(1);
  variantQuantities = signal<Record<string, number>>({});
  productNote = signal<string>('');

  constructor() {
    effect(() => {
      const p = this.product();
      this.selectedQuantity.set(1);
      this.productNote.set('');
      
      const initialQuantities: Record<string, number> = {};
      if (p.variants?.length) {
        p.variants.forEach(v => {
          initialQuantities[v.id] = 0;
        });
        initialQuantities[p.variants[0].id] = 1;
      }
      this.variantQuantities.set(initialQuantities);
    },);
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

  handleAdd() {
    this.onAddToCart.emit({
      product: this.product(),
      quantity: this.selectedQuantity(),
      variants: this.variantQuantities(),
      note: this.productNote()
    });
  }
}
