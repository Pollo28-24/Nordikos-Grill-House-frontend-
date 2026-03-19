import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from '../../../componentes/shared/navbar/navbar';
import { ModifiersService } from '../../../core/services/modifiers/modifiers.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModifierCategory } from '../../../core/models/product.model';


@Component({
  selector: 'app-manage-modifier-categories',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactiveFormsModule, Navbar],
  templateUrl: './categories.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageModifierCategories {
  private modifiersService = inject(ModifiersService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
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
      if (error) this.toast.show('Error al actualizar categoría', 'error');
      else this.toast.show('Categoría actualizada', 'success');
    } else {
      const { error } = await this.modifiersService.createCategory(val);
      if (error) this.toast.show('Error al crear categoría', 'error');
      else this.toast.show('Categoría creada', 'success');
    }

    this.showForm.set(false);
  }

  async delete(id: string | number) {
    if (!confirm('¿Seguro que quieres eliminar esta categoría?')) return;
    const { error } = await this.modifiersService.deleteCategory(id);
    if (error) this.toast.show('Error al eliminar categoría', 'error');
    else this.toast.show('Categoría eliminada', 'success');
  }
}
