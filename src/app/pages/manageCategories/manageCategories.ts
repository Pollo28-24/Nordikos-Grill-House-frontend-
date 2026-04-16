import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CategoriesService, Category } from '@core/services/categories.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { Navbar } from "@app/shared/components/navbar/navbar";
import { CategoryCard } from './components/category-card/category-card';

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, Navbar, CategoryCard],
  templateUrl: './manageCategories.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageCategories {
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);
  private feedback = inject(UserFeedbackService);

  // Service Signals
  categories = this.categoriesService.categories;
  loading = this.categoriesService.loading;
  creating = this.categoriesService.creating;
  updatingId = this.categoriesService.updatingId;

  // Local State
  showCreateForm = signal(false);
  newCategoryName = signal('');
  newCategoryDescription = signal('');

  toggleCreateForm() {
    this.showCreateForm.update((v) => !v);
    if (!this.showCreateForm()) {
      this.newCategoryName.set('');
      this.newCategoryDescription.set('');
    }
  }
  
  // Create Category
  async createCategory() {
    if (!this.newCategoryName().trim()) return;
    
    await this.categoriesService.createCategory(this.newCategoryName(), this.newCategoryDescription());
    this.newCategoryName.set('');
    this.newCategoryDescription.set('');
    this.showCreateForm.set(false);
  }

  // Edit Name
  async updateName(id: string, newName: string) {
    if (!newName.trim()) return; // Prevent empty names
    await this.categoriesService.updateCategory(id, { nombre: newName.trim() });
  }

  // Edit Description
  async updateDescription(id: string, newDescription: string) {
    await this.categoriesService.updateCategory(id, { descripcion: newDescription.trim() });
  }

  // Toggle Visibility
  async toggleVisibility(category: Category) {
    // Toggle logic: If currently hidden (false), make visible (true). Otherwise hide (false).
    const newVisible = category.visible === false;
    await this.categoriesService.updateCategory(category.id, { visible: newVisible });
  }

  // Delete Category
  deleteCategory(category: Category) {
    this.feedback.confirmAndExecute({
      title: 'Eliminar categoría',
      message: `¿Estás seguro de eliminar "${category.nombre}"? Se eliminarán todos los productos, variantes y fotos relacionados.`,
      confirmText: 'Eliminar todo',
      action: () => this.categoriesService.deleteCategory(category.id),
      successMsg: 'Categoría eliminada con éxito',
      errorMsg: 'Error al eliminar categoría'
    });
  }

  // Navigation
  addProduct(categoryId: string) {
    this.router.navigate(['/manageProducts/createProducts'], { 
      queryParams: { categoria_id: categoryId } 
    });
  }
}
