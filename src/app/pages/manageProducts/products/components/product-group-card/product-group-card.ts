import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-product-group-card',
  standalone: true,
  imports: [CurrencyPipe, LucideAngularModule],
  templateUrl: './product-group-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGroupCard {
  // Inputs
  group = input.required<any>();
  displayName = input.required<string>();
  editingCategoryId = input<string | null>(null);
  editingCategoryName = input<string>('');

  // Outputs
  addProduct = output<string>();
  toggleVisibility = output<string>();
  
  startEditingCategory = output<{ id: string; name: string }>();
  cancelEditingCategory = output<void>();
  updateCategoryNameInput = output<string>();
  saveCategoryName = output<{ id: string; originalName: string }>();
  
  editProduct = output<string>();
  deleteProduct = output<any>();
}
