import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Navbar } from '@shared/components/navbar/navbar';
import { ModifiersService } from '@core/services/modifiers/modifiers.service';
import { ProductsService } from '@core/services/products.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { Modifier, Product } from '@core/models/product.model';
import { ModifierItemCard } from './components/modifier-item-card/modifier-item-card';

@Component({
  selector: 'app-manage-modifiers',
  standalone: true,
  imports: [LucideAngularModule, ReactiveFormsModule, Navbar, RouterLink, ModifierItemCard],
  templateUrl: './items.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageModifiers implements OnInit {
  private modifiersService = inject(ModifiersService);
  private productsService = inject(ProductsService);
  private fb = inject(FormBuilder);
  private feedback = inject(UserFeedbackService);
  private route = inject(ActivatedRoute);

  modifiers = this.modifiersService.modifiers;
  categories = this.modifiersService.categories;
  products = this.productsService.products;
  loading = this.modifiersService.loading;

  // Filter by category
  selectedCategoryId = signal<string | number | null>(null);

  filteredModifiers = computed(() => {
    const mods = this.modifiers();
    const catId = this.selectedCategoryId();
    if (!catId) return mods;
    return mods.filter(m => String(m.categoria_id) === String(catId));
  });

  showForm = signal(false);
  showAssignModal = signal(false);
  editingId = signal<string | number | null>(null);
  selectedModifierForAssign = signal<Modifier | null>(null);
  assignedProductIds = signal<Set<string | number>>(new Set());

  form = this.fb.group({
    nombre: ['', [Validators.required]],
    categoria_id: [null as string | number | null, [Validators.required]],
    precio: [0, [Validators.required, Validators.min(0)]],
    costo: [0, [Validators.min(0)]],
    cantidad_maxima: [1, [Validators.required, Validators.min(1)]],
    visible: [true],
    sku: [''],
    tipo: ['plus' as 'plus' | 'minus', [Validators.required]]
  });

  constructor() {
    this.route.queryParams
      .pipe(takeUntilDestroyed())
      .subscribe(params => {
        if (params['categoria_id']) {
          this.selectedCategoryId.set(params['categoria_id']);
        }
      });
  }

  ngOnInit() {
    this.modifiersService.reloadAll();
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ 
      visible: true, 
      precio: 0, 
      costo: 0, 
      cantidad_maxima: 1,
      tipo: 'plus',
      categoria_id: this.categories()[0]?.id || null 
    });
    this.showForm.set(true);
  }

  openEdit(mod: Modifier) {
    this.editingId.set(mod.id);
    this.form.patchValue({
      nombre: mod.nombre,
      categoria_id: mod.categoria_id,
      precio: mod.precio,
      costo: mod.costo || 0,
      cantidad_maxima: mod.cantidad_maxima,
      visible: mod.visible,
      sku: mod.sku || '',
      tipo: mod.tipo || 'plus'
    });
    this.showForm.set(true);
  }

  async save() {
    if (this.form.invalid) return;

    const val = this.form.value as any;
    const id = this.editingId();

    if (id) {
      // Eliminamos campos que no existen en la base de datos antes de enviar
      const { tipo, ...dataToUpdate } = val;
      const { error } = await this.modifiersService.updateModifier(id, dataToUpdate);
      if (error) this.feedback.showError('Error al actualizar modificador');
      else this.feedback.showSuccess('Modificador actualizado');
    } else {
      // Eliminamos campos que no existen en la base de datos antes de enviar
      const { tipo, ...dataToCreate } = val;
      const { error } = await this.modifiersService.createModifier(dataToCreate);
      if (error) this.feedback.showError('Error al crear modificador');
      else this.feedback.showSuccess('Modificador creado');
    }

    this.showForm.set(false);
  }

  delete(mod: Modifier) {
    this.feedback.confirmAndExecute({
      title: 'Eliminar modificador',
      message: `¿Seguro que quieres eliminar "${mod.nombre}"?`,
      confirmText: 'Sí, eliminar',
      action: async () => {
        const { error } = await this.modifiersService.deleteModifier(mod.id);
        if (error) throw new Error();
      },
      successMsg: 'Modificador eliminado',
      errorMsg: 'Error al eliminar modificador'
    });
  }

  // ASSIGNMENT LOGIC
  async openAssign(mod: Modifier) {
    this.selectedModifierForAssign.set(mod);
    const { data: assignments } = await this.modifiersService.getModifierAssignments(mod.id);
    
    const ids = new Set((assignments || []).map((a: any) => a.producto_id));
    this.assignedProductIds.set(ids);
    this.showAssignModal.set(true);
  }

  async toggleAssignment(product: Product) {
    const mod = this.selectedModifierForAssign();
    if (!mod) return;

    const isAssigned = this.assignedProductIds().has(product.id);
    const newSet = new Set(this.assignedProductIds());

    if (isAssigned) {
      const { error } = await this.modifiersService.removeFromProduct(product.id, mod.id);
      if (!error) {
        newSet.delete(product.id);
        this.assignedProductIds.set(newSet);
      }
    } else {
      const { error } = await this.modifiersService.assignToProduct(product.id, mod.id, mod.cantidad_maxima);
      if (!error) {
        newSet.add(product.id);
        this.assignedProductIds.set(newSet);
      }
    }
  }
}
