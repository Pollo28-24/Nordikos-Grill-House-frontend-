import { Component, ChangeDetectionStrategy, input, output, signal, inject, effect } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Product } from '@core/models/product.model';
import { ProductsService } from '@core/services/products.service';

@Component({
  selector: 'app-product-group-card',
  standalone: true,
  imports: [CurrencyPipe, LucideAngularModule, DragDropModule],
  templateUrl: './product-group-card.html',
  styles: `
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 12px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.5);
      background: #1A1A1A;
      border: 1px solid #FFB30040;
    }
    .cdk-drag-placeholder {
      opacity: 0.1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGroupCard {
  private productsService = inject(ProductsService);

  // Inputs
  group = input.required<any>();
  displayName = input.required<string>();
  editingCategoryId = input<string | null>(null);
  editingCategoryName = input<string>('');

  // Local State
  isOrdering = signal(false);
  localProducts = signal<Product[]>([]);

  // Outputs
  addProduct = output<string>();
  toggleVisibility = output<string>();
  
  startEditingCategory = output<{ id: string; name: string }>();
  cancelEditingCategory = output<void>();
  updateCategoryNameInput = output<string>();
  saveCategoryName = output<{ id: string; originalName: string }>();
  
  editProduct = output<string>();
  deleteProduct = output<any>();

  constructor() {
    effect(() => {
      const groupProducts = this.group().products;
      if (groupProducts) {
        this.localProducts.set([...groupProducts]);
      }
    });
  }

  toggleOrdering() {
    this.isOrdering.update(v => !v);
  }

  onDrop(event: CdkDragDrop<Product[]>) {
    const products = [...this.localProducts()];
    moveItemInArray(products, event.previousIndex, event.currentIndex);
    this.localProducts.set(products);
    
    // Guardado automático del orden de productos
    this.productsService.updateProductsOrder(products);
  }
}
