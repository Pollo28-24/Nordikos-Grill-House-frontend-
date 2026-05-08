import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '@core/models/category.model';

@Component({
  selector: 'app-category-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-nav.html',
})
export class CategoryNav {
  categories = input<Category[]>([]);
  selectedCategoryId = input<string | null>(null);
  
  onSelect = output<string | null>();
}
