import { Component, ChangeDetectionStrategy, inject, signal, OnInit, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Navbar } from '@shared/components/navbar/navbar';
import { ModifiersService } from '@core/services/modifiers/modifiers.service';
import { ProductsService } from '@core/services/products.service';
import { CategoriesService } from '@core/services/categories.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { Modifier, Product, CreateModifierDto, UpdateModifierDto } from '@core/models/product.model';
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
  private categoriesService = inject(CategoriesService);
  private fb = inject(FormBuilder);
  private feedback = inject(UserFeedbackService);
  private route = inject(ActivatedRoute);

  modifiers = this.modifiersService.modifiers;
  categories = this.modifiersService.categories;
  products = this.productsService.products;
  productCategories = this.categoriesService.visibleCategories;
  loading = this.modifiersService.loading;
  initialLoading = this.modifiersService.initialLoading;

  // Filter by category
  selectedCategoryId = signal<string | number | null>(null);

  filteredModifiers = computed(() => {
    const mods = this.modifiers();
    const catId = this.selectedCategoryId();
    if (!catId) return mods;
    return mods.filter(m => String(m.categoria_id) === String(catId));
  });

  showForm = signal(false);
  isSaving = signal(false);
  showAssignModal = signal(false);
  editingId = signal<string | number | null>(null);
  selectedModifierForAssign = signal<Modifier | null>(null);
  assignedProductIds = signal<Set<string | number>>(new Set());

  // Estado y filtros para el Modal de Asignación (Indexados & Accesibles)
  assignSearchTerm = signal<string>('');
  assignSelectedCategoryId = signal<string | number | null>(null);

  form = this.fb.group({
    nombre: ['', [Validators.required]],
    categoria_id: [null as string | number | null, [Validators.required]],
    precio: [0, [Validators.required, Validators.min(0)]],
    costo: [0, [Validators.min(0)]],
    cantidad_maxima: [1, [Validators.required, Validators.min(1)]],
    visible: [true],
    disponible: [true],
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

  toggleFormField(field: 'visible' | 'disponible') {
    const ctrl = this.form.get(field);
    if (ctrl) {
      ctrl.setValue(!ctrl.value);
    }
  }

  async onToggleModifierStatus(event: { field: 'visible' | 'disponible', value: boolean }, mod: Modifier) {
    const { error } = await this.modifiersService.toggleModifierStatus(mod.id, event.field, event.value);
    if (error) {
      this.feedback.showError(`Error al actualizar estado en ${event.field}`);
    } else {
      const fieldName = event.field === 'disponible' ? 'Disponibilidad POS' : 'Visibilidad en Menú';
      const statusText = event.value ? 'activada' : 'pausada';
      this.feedback.showSuccess(`${fieldName} ${statusText}`);
    }
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ 
      visible: true, 
      disponible: true,
      precio: 0, 
      costo: 0, 
      cantidad_maxima: 1,
      categoria_id: this.categories()[0]?.id || null,
      sku: ''
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
      visible: mod.visible !== false,
      disponible: mod.disponible !== false,
      sku: mod.sku || ''
    });
    this.showForm.set(true);
  }

  async save() {
    if (this.form.invalid || this.isSaving()) return;

    this.isSaving.set(true);
    const val = this.form.getRawValue();
    const id = this.editingId();

    const payload: CreateModifierDto = {
      nombre: String(val.nombre || '').trim(),
      categoria_id: val.categoria_id!,
      precio: Number(val.precio || 0),
      costo: Number(val.costo || 0),
      cantidad_maxima: Number(val.cantidad_maxima || 1),
      visible: Boolean(val.visible),
      disponible: Boolean(val.disponible),
      sku: val.sku ? String(val.sku).trim() : ''
    };

    try {
      if (id) {
        const { error } = await this.modifiersService.updateModifier(id, payload);
        if (error) {
          this.feedback.showError('Error al actualizar modificador');
          return;
        }
        this.feedback.showSuccess('Modificador actualizado');
      } else {
        const { error } = await this.modifiersService.createModifier(payload);
        if (error) {
          this.feedback.showError('Error al crear modificador');
          return;
        }
        this.feedback.showSuccess('Modificador creado');
      }

      this.showForm.set(false);
    } finally {
      this.isSaving.set(false);
    }
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

  // Normalizador de búsqueda (insensible a mayúsculas y acentos)
  private normalize(input: any): string {
    const s = String(input ?? '').toLowerCase().trim();
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  // Índice O(1) de productos agrupados por categoría
  productsByCategoryMap = computed(() => {
    const map = new Map<string, Product[]>();
    for (const p of this.products()) {
      const catKey = p.categoria_id != null ? String(p.categoria_id) : 'uncategorized';
      let list = map.get(catKey);
      if (!list) {
        list = [];
        map.set(catKey, list);
      }
      list.push(p);
    }
    return map;
  });

  // Estadísticas de asignación por categoría y global calculadas en O(N) de una sola pasada
  categoryStats = computed(() => {
    const stats = new Map<string, { total: number; assigned: number }>();
    const assigned = this.assignedProductIds();
    const allProds = this.products();

    let totalGlobal = allProds.length;
    let assignedGlobal = 0;

    for (const p of allProds) {
      const isAssigned = assigned.has(p.id);
      if (isAssigned) assignedGlobal++;

      const catKey = p.categoria_id != null ? String(p.categoria_id) : 'uncategorized';
      let catStat = stats.get(catKey);
      if (!catStat) {
        catStat = { total: 0, assigned: 0 };
        stats.set(catKey, catStat);
      }
      catStat.total++;
      if (isAssigned) catStat.assigned++;
    }

    return {
      global: { total: totalGlobal, assigned: assignedGlobal },
      byCategory: stats
    };
  });

  getCategoryStat(catId: string | number) {
    return this.categoryStats().byCategory.get(String(catId)) ?? { total: 0, assigned: 0 };
  }

  // Lista filtrada reactiva: Categoría O(1) + Búsqueda incremental + Ordenamiento (Asignados primero -> Alfabético)
  modalFilteredProducts = computed(() => {
    const catId = this.assignSelectedCategoryId();
    const search = this.normalize(this.assignSearchTerm());
    const assigned = this.assignedProductIds();

    let list: Product[];
    if (catId === null) {
      list = this.products();
    } else {
      list = this.productsByCategoryMap().get(String(catId)) ?? [];
    }

    if (search) {
      list = list.filter(p => {
        const name = this.normalize(p.nombre);
        const sku = this.normalize(p.sku);
        return name.includes(search) || sku.includes(search);
      });
    }

    return [...list].sort((a, b) => {
      const aAssigned = assigned.has(a.id) ? 1 : 0;
      const bAssigned = assigned.has(b.id) ? 1 : 0;
      if (aAssigned !== bAssigned) {
        return bAssigned - aAssigned; // 1 (asignado) antes de 0 (no asignado)
      }
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });
  });

  // ASSIGNMENT LOGIC
  async openAssign(mod: Modifier) {
    this.selectedModifierForAssign.set(mod);
    this.assignSearchTerm.set('');
    this.assignSelectedCategoryId.set(null);

    const { data: assignments } = await this.modifiersService.getModifierAssignments(mod.id);
    
    const ids = new Set((assignments || []).map((a: any) => a.producto_id));
    this.assignedProductIds.set(ids);
    this.showAssignModal.set(true);

    // Auto-foco en el input de búsqueda para máxima ergonomía
    setTimeout(() => {
      const input = document.getElementById('assign-product-search-input') as HTMLInputElement | null;
      if (input) input.focus();
    }, 100);
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
