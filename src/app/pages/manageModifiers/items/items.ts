import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {  Navbar } from "../../../componentes/shared/navbar/navbar";
import { ModifiersService } from '../../../core/services/modifiers/modifiers.service';
import { ProductsService } from '../../../core/services/products.service';
import { ToastService } from '../../../core/services/toast.service';
import { Modifier, Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-manage-modifiers',
  standalone: true,
  imports: [LucideAngularModule, ReactiveFormsModule, Navbar, RouterLink, ],
  templateUrl: './items.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageModifiers implements OnInit {
  private modifiersService = inject(ModifiersService);
  private productsService = inject(ProductsService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);
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
    sku: ['']
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
      sku: mod.sku || ''
    });
    this.showForm.set(true);
  }

  async save() {
    if (this.form.invalid) return;

    const val = this.form.value as any;
    const id = this.editingId();

    if (id) {
      const { error } = await this.modifiersService.updateModifier(id, val);
      if (error) this.toast.show('Error al actualizar modificador', 'error');
      else this.toast.show('Modificador actualizado', 'success');
    } else {
      const { error } = await this.modifiersService.createModifier(val);
      if (error) this.toast.show('Error al crear modificador', 'error');
      else this.toast.show('Modificador creado', 'success');
    }

    this.showForm.set(false);
  }

  async delete(id: string | number) {
    if (!confirm('¿Seguro que quieres eliminar este modificador?')) return;
    const { error } = await this.modifiersService.deleteModifier(id);
    if (error) this.toast.show('Error al eliminar modificador', 'error');
    else this.toast.show('Modificador eliminado', 'success');
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
