import { ChangeDetectionStrategy, Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Dialog } from '@angular/cdk/dialog';
import { LucideAngularModule } from 'lucide-angular';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { CategoriesService } from '@core/services/categories.service';
import { Category } from '@core/models/category.model';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { Navbar } from "@app/shared/components/navbar/navbar";
import { CategoryCard } from './components/category-card/category-card';
import { ProductFormModal } from '../manageProducts/product-form-modal/product-form-modal';

@Component({
  selector: 'app-manage-categories',
  standalone: true,
  imports: [FormsModule, LucideAngularModule, Navbar, CategoryCard, DragDropModule],
  templateUrl: './manageCategories.html',
  styles: `
    :host {
      display: block;
    }
    .cdk-drag-preview {
      box-sizing: border-box;
      border-radius: 16px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.4);
      background: #202020;
      border: 1px solid #FFB30040;
    }
    .cdk-drag-placeholder {
      opacity: 0.2;
    }
    .cdk-drag-animating {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
    .cdk-drop-list-dragging .cdk-drag {
      transition: transform 250ms cubic-bezier(0, 0, 0.2, 1);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManageCategories {
  private categoriesService = inject(CategoriesService);
  private router = inject(Router);
  private dialog = inject(Dialog);
  private feedback = inject(UserFeedbackService);

  // Service Signals
  categories = this.categoriesService.categories;
  loading = this.categoriesService.loading;
  creating = this.categoriesService.creating;
  updatingId = this.categoriesService.updatingId;

  // Local State for Drag & Drop
  localCategories = signal<Category[]>([]);
  showCreateForm = signal(false);
  newCategoryName = signal('');
  newCategoryDescription = signal('');

  constructor() {
    // Sincronizar categorías locales cuando el servicio cargue datos
    effect(() => {
      const cats = this.categories();
      // Sincronizamos si localCategories está vacío o si la longitud cambió, 
      // pero solo si no estamos en medio de una operación de carga
      if (!this.loading() && (this.localCategories().length !== cats.length || (cats.length > 0 && this.localCategories().length === 0))) {
        this.localCategories.set([...cats]);
      }
    });
  }

  onDrop(event: CdkDragDrop<Category[]>) {
    const currentCats = [...this.localCategories()];
    moveItemInArray(currentCats, event.previousIndex, event.currentIndex);
    this.localCategories.set(currentCats);
    
    // Guardado automático del nuevo orden
    this.categoriesService.updateCategoriesOrder(currentCats);
  }

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
    this.dialog.open(ProductFormModal, {
      data: { categoria_id: categoryId },
      panelClass: ['bg-transparent', 'w-full', 'h-full', 'max-w-none', 'md:w-[90vw]', 'md:h-auto', 'md:max-w-[1000px]'],
      backdropClass: 'custom-modal-backdrop',
      disableClose: true
    });
  }
}
