import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  ElementRef,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ProductsService } from '@core/services/products.service';
import { CategoriesService } from '@core/services/categories.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { Navbar } from '@shared/components/navbar/navbar';
import { ProductGroupCard } from './components/product-group-card/product-group-card';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [Navbar, LucideAngularModule, ProductGroupCard],
  templateUrl: './products.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Products {
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private userFeedback = inject(UserFeedbackService);
  private router = inject(Router);

  @ViewChild('categoryScroller', { static: true })
  private categoryScroller!: ElementRef<HTMLDivElement>;

  // --------------------------
  // STATE (Signal First)
  // --------------------------

  selectedCategoryId = signal<string | null>(null);
  
  // Visibility cache (reactive) to persist state across re-computations
  private visibilityCache = signal<Record<string, boolean>>({});

  // Category editing state
  editingCategoryId = signal<string | null>(null);
  editingCategoryName = signal('');
  
  // Local overrides for category names (for optimistic updates or UI state)
  categoryNameOverrides = signal<Record<string, string>>({});

  categories = this.categoriesService.categories;
  products = this.productsService.products;

  // --------------------------
  // DERIVED STATE
  // --------------------------

  groupedProducts = computed(() => {
    const selectedId = this.selectedCategoryId();
    const categories = this.categories();
    const products = this.products();
    const overrides = this.categoryNameOverrides();
    const visibility = this.visibilityCache();

    if (!categories.length) return [];

    if (selectedId) {
      const category = categories.find((c) => c.id === selectedId);
      return [
        {
          categoryId: selectedId,
          categoryName: category?.nombre ?? 'Categoría',
          displayName: overrides[selectedId] || (category?.nombre ?? 'Categoría'),
          categoryDescription: category?.descripcion,
          products: products.filter((p) => p.categoria_id === selectedId),
          isVisible: true, // Always visible when selected
        },
      ];
    }

    return categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.nombre,
      displayName: overrides[category.id] || category.nombre,
      categoryDescription: category.descripcion,
      products: products.filter((p) => p.categoria_id === category.id),
      isVisible: visibility[category.id] ?? true,
    }));
  });

  productsCount = computed(() =>
    this.groupedProducts().reduce((acc, group) => acc + group.products.length, 0)
  );

  isEmpty = computed(() =>
    this.groupedProducts().every((group) => group.products.length === 0)
  );

  // --------------------------
  // ACTIONS
  // --------------------------

  filterProductsByCategory(id: string | null) {
    this.selectedCategoryId.set(id);
  }

  showAllCategories() {
    this.selectedCategoryId.set(null);

    this.categoryScroller.nativeElement.scrollTo({
      left: 0,
      behavior: 'smooth',
    });
  }

  editProduct(id: string) {
    this.router.navigate(['/manage-products/edit', id]);
  }

  addProductToCategory(categoryId: string | null) {
    this.router.navigate(['/manageProducts/createProducts'], {
      queryParams: categoryId ? { categoria_id: categoryId } : {},
    });
  }

  toggleVisibility(categoryId: string) {
    this.visibilityCache.update(cache => ({
      ...cache,
      [categoryId]: !(cache[categoryId] ?? true)
    }));
  }

  deleteProduct(product: any) {
    this.userFeedback.confirmAndExecute({
      title: 'Eliminar producto',
      message: `¿Eliminar "${product.nombre}"?`,
      confirmText: 'Sí, eliminar',
      action: () => this.productsService.delete(product.id),
      successMsg: 'Producto eliminado',
      errorMsg: 'Error al eliminar',
    });
  }

  // --------------------------
  // CATEGORY EDITING
  // --------------------------

  startEditingCategory(categoryId: string, currentName: string) {
    this.editingCategoryId.set(categoryId);
    // Use override if exists, otherwise original
    this.editingCategoryName.set(this.categoryNameOverrides()[categoryId] || currentName);
  }

  cancelEditingCategory() {
    this.editingCategoryId.set(null);
    this.editingCategoryName.set('');
  }

  onEditingCategoryNameInput(value: string) {
    this.editingCategoryName.set(value);
  }

  async saveCategoryName(categoryId: string, originalName: string) {
    const newName = this.editingCategoryName().trim();
    
    if (!newName || newName === originalName) {
      this.cancelEditingCategory();
      return;
    }

    // Optimistic update
    this.categoryNameOverrides.update(overrides => ({
      ...overrides,
      [categoryId]: newName
    }));
    
    this.cancelEditingCategory();

    const updated = await this.categoriesService.updateCategory(categoryId, { nombre: newName });
    
    if (updated) {
      this.userFeedback.showSuccess('Categoría actualizada');
      // Clear override since the source signal will update
      this.categoryNameOverrides.update(overrides => {
        const { [categoryId]: removed, ...rest } = overrides;
        return rest;
      });
    } else {
      this.userFeedback.showError('Error al actualizar categoría');
      // Revert override
      this.categoryNameOverrides.update(overrides => {
        const { [categoryId]: removed, ...rest } = overrides;
        return rest;
      });
    }
  }
}
