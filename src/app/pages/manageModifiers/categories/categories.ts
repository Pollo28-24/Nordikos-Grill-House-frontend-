import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from '@shared/components/navbar/navbar';
import { ModifiersService } from '@core/services/modifiers/modifiers.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { ModifierCategory, ModifierSelectionType } from '@core/models/product.model';
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
  isSaving = signal(false);
  editingId = signal<string | number | null>(null);

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: [''],
    tipo_seleccion: ['CHECKBOX' as ModifierSelectionType, [Validators.required]],
    min_selections: [0, [Validators.required, Validators.min(0)]],
    max_selections: [99, [Validators.required, Validators.min(1)]],
    obligatorio: [false],
    orden_visual: [10, [Validators.required, Validators.min(1)]],
    visible: [true]
  }, {
    validators: (group) => {
      const min = group.get('min_selections')?.value;
      const max = group.get('max_selections')?.value;
      if (min != null && max != null && Number(min) > Number(max)) {
        return { minGreaterThanMax: true };
      }
      return null;
    }
  });

  constructor() {
    this.form.get('tipo_seleccion')?.valueChanges.subscribe(tipo => {
      if (tipo === 'RADIO') {
        this.form.patchValue({
          min_selections: 1,
          max_selections: 1,
          obligatorio: true
        }, { emitEvent: false });
      }
    });
  }

  navigateToItems(categoryId: string | number) {
    this.router.navigate(['/manageModifiers/items'], { 
      queryParams: { categoria_id: categoryId } 
    });
  }

  openForm() {
    this.editingId.set(null);
    this.form.reset({
      nombre: '',
      descripcion: '',
      tipo_seleccion: 'CHECKBOX',
      min_selections: 0,
      max_selections: 99,
      obligatorio: false,
      orden_visual: (this.categories().length + 1) * 5,
      visible: true
    });
    this.showForm.set(true);
  }

  openEdit(cat: ModifierCategory) {
    this.editingId.set(cat.id);
    this.form.patchValue({
      nombre: cat.nombre,
      descripcion: cat.descripcion || '',
      tipo_seleccion: cat.tipo_seleccion || 'CHECKBOX',
      min_selections: cat.min_selections ?? 0,
      max_selections: cat.max_selections ?? 99,
      obligatorio: cat.obligatorio ?? false,
      orden_visual: cat.orden_visual ?? 10,
      visible: cat.visible !== false
    });
    this.showForm.set(true);
  }

  async save() {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    const rawVal = this.form.getRawValue();
    const id = this.editingId();

    const payload = {
      nombre: String(rawVal.nombre || '').trim(),
      descripcion: rawVal.descripcion ? String(rawVal.descripcion).trim() : null,
      tipo_seleccion: rawVal.tipo_seleccion as ModifierSelectionType,
      min_selections: Number(rawVal.min_selections ?? 0),
      max_selections: Number(rawVal.max_selections ?? 99),
      obligatorio: Boolean(rawVal.obligatorio),
      orden_visual: Number(rawVal.orden_visual ?? 10),
      visible: Boolean(rawVal.visible)
    };

    try {
      if (id) {
        const { error } = await this.modifiersService.updateCategory(id, payload);
        if (error) {
          if (error.code === '23505') {
            this.feedback.showError('Ya existe una categoría con ese nombre');
          } else {
            this.feedback.showError('Error al actualizar categoría');
          }
          return;
        }
        this.feedback.showSuccess('Categoría actualizada');
      } else {
        const { error } = await this.modifiersService.createCategory(payload);
        if (error) {
          if (error.code === '23505') {
            this.feedback.showError('Ya existe una categoría con ese nombre');
          } else {
            this.feedback.showError('Error al crear categoría');
          }
          return;
        }
        this.feedback.showSuccess('Categoría creada');
      }

      this.showForm.set(false);
    } finally {
      this.isSaving.set(false);
    }
  }

  delete(category: ModifierCategory) {
    this.feedback.confirmAndExecute({
      title: 'Eliminar categoría',
      message: `¿Seguro que quieres eliminar "${category.nombre}"?`,
      confirmText: 'Sí, eliminar',
      isDanger: true,
      action: async () => {
        const { error } = await this.modifiersService.deleteCategory(category.id);
        if (error) throw new Error();
      },
      successMsg: 'Categoría eliminada',
      errorMsg: 'Error al eliminar categoría'
    });
  }
}
