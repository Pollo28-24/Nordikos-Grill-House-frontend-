import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Category } from '@core/models/category.model';

@Component({
  selector: 'app-category-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './category-nav.html',
  styles: [`
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  `]
})
export class CategoryNav {
  categories = input<Category[]>([]);
  selectedCategoryId = input<string | null>(null);
  
  onSelect = output<string | null>();
}
