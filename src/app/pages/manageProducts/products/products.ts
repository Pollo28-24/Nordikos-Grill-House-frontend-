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
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { ProductsService } from '../../../core/services/products.service';
import { CategoriesService } from '../../../core/services/categories.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Navbar } from '../../../componentes/shared/navbar/navbar';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [Navbar, CommonModule, LucideAngularModule],
  templateUrl: './products.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Products {
  private productsService = inject(ProductsService);
  private categoriesService = inject(CategoriesService);
  private confirmService = inject(ConfirmService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  @ViewChild('categoryScroller', { static: true })
  private categoryScroller!: ElementRef<HTMLDivElement>;

  // --------------------------
  // STATE (Signal First)
  // --------------------------

  selectedCategoryId = signal<string | null>(null);
  
  // Visibility cache (non-reactive) to persist state across re-computations
  private visibilityCache: Record<string, boolean> = {};

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

    if (!categories.length) return [];

    if (selectedId) {
      const category = categories.find((c) => c.id === selectedId);
      return [
        {
          categoryId: selectedId,
          categoryName: category?.nombre ?? 'Categoría',
          categoryDescription: category?.descripcion,
          products: products.filter((p) => p.categoria_id === selectedId),
          visible: signal(true), // Always visible when selected
        },
      ];
    }

    return categories.map((category) => ({
      categoryId: category.id,
      categoryName: category.nombre,
      categoryDescription: category.descripcion,
      products: products.filter((p) => p.categoria_id === category.id),
      visible: signal(this.visibilityCache[category.id] ?? true),
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
    this.router.navigate(['/manage-products/createProducts'], {
      queryParams: categoryId ? { categoria_id: categoryId } : {},
    });
  }

  toggleVisibility(group: { categoryId: string, visible: WritableSignal<boolean> }) {
    const newValue = !group.visible();
    group.visible.set(newValue);
    this.visibilityCache[group.categoryId] = newValue;
  }

  deleteProduct(product: any) {
    this.confirmService.open({
      title: 'Eliminar producto',
      message: `¿Eliminar "${product.nombre}"?`,
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        const success = await this.productsService.deleteProduct(product.id);

        if (success) {
          this.toastService.show('Producto eliminado', 'success');
        } else {
          this.toastService.show('Error al eliminar', 'error');
        }
      },
    });
  }

  // --------------------------
  // CATEGORY EDITING
  // --------------------------

  getCategoryDisplayName(categoryId: string, originalName: string): string {
    return this.categoryNameOverrides()[categoryId] || originalName;
  }

  startEditingCategory(categoryId: string, currentName: string) {
    this.editingCategoryId.set(categoryId);
    // Use override if exists, otherwise original
    this.editingCategoryName.set(this.getCategoryDisplayName(categoryId, currentName));
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
      this.toastService.show('Categoría actualizada', 'success');
      // Clear override since the source signal will update
      this.categoryNameOverrides.update(overrides => {
        const { [categoryId]: removed, ...rest } = overrides;
        return rest;
      });
    } else {
      this.toastService.show('Error al actualizar categoría', 'error');
      // Revert override
      this.categoryNameOverrides.update(overrides => {
        const { [categoryId]: removed, ...rest } = overrides;
        return rest;
      });
    }
  }
}
