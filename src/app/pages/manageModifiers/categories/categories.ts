import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from '@shared/components/navbar/navbar';
import { ModifiersService } from '@core/services/modifiers/modifiers.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { ModifierCategory } from '@core/models/product.model';
import { ModifierCategoryCard } from './components/category-card/category-card';


@Component({
  selector: 'app-manage-modifier-categories',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule, Navbar, ModifierCategoryCard],
  templateUrl: './categories.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageModifierCategories {
  private modifiersService = inject(ModifiersService);
  private fb = inject(FormBuilder);
  private feedback = inject(UserFeedbackService);
  private router = inject(Router);

  categories = this.modifiersService.categories;
  loading = this.modifiersService.loading;

  showForm = signal(false);
  editingId = signal<string | number | null>(null);

  form = this.fb.group({
    nombre: ['', [Validators.required]],
    descripcion: [''],
    visible: [true]
  });

  navigateToItems(categoryId: string | number) {
    this.router.navigate(['/manageModifiers/items'], { 
      queryParams: { categoria_id: categoryId } 
    });
  }

  openForm() {
    this.editingId.set(null);
    this.form.reset({ visible: true });
    this.showForm.set(true);
  }

  openEdit(cat: ModifierCategory) {
    this.editingId.set(cat.id);
    this.form.patchValue({
      nombre: cat.nombre,
      descripcion: cat.descripcion,
      visible: cat.visible
    });
    this.showForm.set(true);
  }

  async save() {
    if (this.form.invalid) return;

    const val = this.form.value as any;
    const id = this.editingId();

    if (id) {
      const { error } = await this.modifiersService.updateCategory(id, val);
      if (error) this.feedback.showError('Error al actualizar categoría');
      else this.feedback.showSuccess('Categoría actualizada');
    } else {
      const { error } = await this.modifiersService.createCategory(val);
      if (error) this.feedback.showError('Error al crear categoría');
      else this.feedback.showSuccess('Categoría creada');
    }

    this.showForm.set(false);
  }

  delete(category: ModifierCategory) {
    this.feedback.confirmAndExecute({
      title: 'Eliminar categoría',
      message: `¿Seguro que quieres eliminar "${category.nombre}"?`,
      confirmText: 'Sí, eliminar',
      action: async () => {
        const { error } = await this.modifiersService.deleteCategory(category.id);
        if (error) throw new Error();
      },
      successMsg: 'Categoría eliminada',
      errorMsg: 'Error al eliminar categoría'
    });
  }
}
