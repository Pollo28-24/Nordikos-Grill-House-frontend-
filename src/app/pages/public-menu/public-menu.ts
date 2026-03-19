import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CategoriesService } from '../../core/services/categories.service';
import { ProductsService } from '../../core/services/products.service';
import { Product } from '../../core/models/product.model';
import { Category } from '../../core/services/categories.service';

@Component({
  selector: 'app-public-menu',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './public-menu.html',
  styles: [`
    .hide-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .hide-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class PublicMenu implements OnInit {
  private categoriesService = inject(CategoriesService);
  private productsService = inject(ProductsService);

  // Categories and Products from services
  categories = this.categoriesService.visibleCategories;
  products = this.productsService.products;
  loading = computed(() => this.categoriesService.loading() || this.productsService.loading());

  // Local state
  selectedCategoryId = signal<string | null>(null);
  searchQuery = signal('');

  // Computed filtered products
  filteredProducts = computed(() => {
    let items = this.products();
    const categoryId = this.selectedCategoryId();
    const query = this.searchQuery().toLowerCase();

    if (categoryId) {
      items = items.filter(p => p.categoria_id === categoryId);
    }

    if (query) {
      items = items.filter(p => 
        p.nombre.toLowerCase().includes(query) || 
        p.descripcion?.toLowerCase().includes(query)
      );
    }

    // Only show visible and available products
    return items.filter(p => p.visible !== false && p.disponible !== false);
  });

  ngOnInit() {
    // Wait for categories to load then select the first one by default if none selected
    // Note: Categories are already loaded by the service on init
  }

  selectCategory(id: string | null) {
    this.selectedCategoryId.set(id);
  }

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  formatPrice(price: number | undefined): string {
    if (price === undefined) return '';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(price);
  }

  getProductsByCategory(categoryId: string | number): Product[] {
    return this.filteredProducts().filter(p => p.categoria_id === categoryId);
  }
}
