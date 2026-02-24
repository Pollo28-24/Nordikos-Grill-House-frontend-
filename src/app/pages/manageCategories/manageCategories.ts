import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CategoriesService, Category } from '../../core/services/categories.service';
import { Navbar } from '../../componentes/shared/navbar/navbar';
import { ConfirmService } from '../../core/services/confirm.service';

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, Navbar],
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
  protected confirmService = inject(ConfirmService);

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
  async updateName(id: string, event: Event) {
    const input = event.target as HTMLInputElement;
    const newName = input.value.trim();
    
    if (!newName) return; // Prevent empty names
    
    await this.categoriesService.updateCategory(id, { nombre: newName });
  }

  // Edit Description
  async updateDescription(id: string, event: Event) {
    const input = event.target as HTMLInputElement | HTMLTextAreaElement;
    const newDescription = input.value.trim();
    
    await this.categoriesService.updateCategory(id, { descripcion: newDescription });
  }

  // Toggle Visibility
  async toggleVisibility(category: Category) {
    // Toggle logic: If currently hidden (false), make visible (true). Otherwise hide (false).
    const newVisible = category.visible === false;
    await this.categoriesService.updateCategory(category.id, { visible: newVisible });
  }

  // Delete Category
  deleteCategory(category: Category) {
    this.confirmService.open({
      title: 'Eliminar categoría',
      message: `¿Estás seguro de eliminar "${category.nombre}"? Se eliminarán todos los productos, variantes y fotos relacionados.`,
      confirmText: 'Eliminar todo',
      onConfirm: async () => {
        await this.categoriesService.deleteCategory(category.id);
      }
    });
  }

  // Navigation
  addProduct(categoryId: string) {
    this.router.navigate(['/manage-products/createProducts'], { 
      queryParams: { categoria_id: categoryId } 
    });
  }
}
