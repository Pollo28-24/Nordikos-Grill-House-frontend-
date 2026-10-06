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
  selectedCategoryId = input<string | number | null>(null);
  /** Tema oscuro (fondo "Brasa nocturna"). false => estilos claros originales. */
  dark = input<boolean>(false);
  
  onSelect = output<string | number | null>();

  protected pillClass(selected: boolean): string {
    if (this.dark()) {
      return selected
        ? 'bg-orange-500 text-white border-transparent shadow-[0_0_18px_rgba(249,115,22,0.35)]'
        : 'bg-[#1d1611] text-[#f1e9da] border-white/10 hover:border-orange-500/40';
    }
    return selected
      ? 'bg-orange-500 text-white border-transparent'
      : 'bg-white text-gray-700 border-[#E2D7B7]/50';
  }

  isSelected(catId: string | number): boolean {
    const current = this.selectedCategoryId();
    return current != null && String(current) === String(catId);
  }
}
