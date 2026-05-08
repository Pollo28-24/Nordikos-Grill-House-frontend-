import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { LucideAngularModule } from "lucide-angular";
import { Product, ProductVariant, CreateProductDto, UpdateProductDto, ProductVariantCreateDto } from '@core/models/product.model';
import { ProductsService } from '@core/services/products.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { LoggerService } from '@core/services/logger.service';
import { DecimalPipe } from '@angular/common';

type PriceMode = 'simple' | 'variant';

@Component({
  selector: 'app-product-form-modal',
  standalone: true,
  imports: [ LucideAngularModule, ReactiveFormsModule, DecimalPipe], 
  templateUrl: './product-form-modal.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormModal {
  private productsService = inject(ProductsService);
  private feedback = inject(UserFeedbackService);
  private fb = inject(FormBuilder);
  private logger = inject(LoggerService);
  private dialogRef = inject(DialogRef<boolean>);
  private dialogData = inject(DIALOG_DATA, { optional: true });

  productId = signal<string | null>(this.dialogData?.productId || null);
  categoriaId = signal<string | null>(this.dialogData?.categoria_id || null);

  product = signal<Product | null>(null);
  
  expandedVariants = signal<Set<string>>(new Set());

  priceMode = signal<PriceMode>('simple');
  selectedFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  isSaving = signal(false);
  imageRemoved = signal(false);

  productForm: FormGroup;

  isEditMode = signal<boolean>(false);

  constructor() {
    this.productForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(0)]],
      descuento: [0, [Validators.min(0)]],
      costo: [0, [Validators.min(0)]],
      embalaje: [''],
      sku: [''],
      productImage: [''],
      disponible: [true],
      visible: [true],
      variants: this.fb.array([]),
    });

    effect(() => {
      const id = this.productId();
      if (id) {
        this.isEditMode.set(true);
        this.loadProduct(id);
      } else {
        this.isEditMode.set(false);
      }
    });
  }

  private createVariantFormGroup(variant?: ProductVariant | ProductVariantCreateDto): FormGroup {
    return this.fb.group({
      id: [('id' in (variant || {}) ? (variant as any).id : null) || crypto.randomUUID()],
      nombre: [variant?.nombre || '', Validators.required],
      precio: [variant?.precio || 0, [Validators.required, Validators.min(0)]],
      descuento: [variant?.descuento || 0, [Validators.min(0)]],
      costo: [variant?.costo || 0, [Validators.min(0)]],
      embalaje: [variant?.embalaje || ''],
      sku: [variant?.sku || ''],
      disponible: [variant?.disponible ?? true],
    });
  }

  async loadProduct(productId: string) {
    try {
      const product = await this.productsService.getProduct(productId);
      
      if (product) {
        this.product.set(product);
        const mainImageUrl =
          product.imagen_url ||
          (product.images && product.images.length ? product.images[0].url : '');
        this.productForm.patchValue({
          nombre: product.nombre,
          descripcion: product.descripcion || '',
          precio: product.precio ?? 0,
          descuento: product.descuento ?? 0,
          costo: product.costo ?? 0,
          embalaje: product.embalaje || '',
          sku: product.sku || '',
          productImage: mainImageUrl || '',
          disponible: product.disponible ?? true,
          visible: product.visible ?? true,
        });
        if (mainImageUrl) {
          this.imagePreviewUrl.set(mainImageUrl);
        }
        this.imageRemoved.set(false);
        this.selectedFile.set(null);
        this.variants.clear();
        if (product.variants) {
          product.variants.forEach((variant) => {
            this.variants.push(this.createVariantFormGroup(variant));
          });
        }
        if (product.variants && product.variants.length > 0) {
          this.priceMode.set('variant');
        } else {
          this.priceMode.set('simple');
        }
      } else {
        this.feedback.showError('Producto no encontrado');
      }
    } catch (error) {
      this.logger.error('Error loading product', error, 'ProductForm');
      this.feedback.showError('Error al cargar el producto');
    }
  }

  get variants() {
    return this.productForm.get('variants') as FormArray<FormGroup>;
  }

  addVariant() {
    const group = this.createVariantFormGroup();
    this.variants.push(group);
    const id = group.get('id')?.value;
    if (id) this.toggleVariant(id);
  }

  removeVariant(index: number) {
    if (this.isEditMode()) {
      this.feedback.confirmAndExecute({
        title: 'Eliminar variante',
        message: '¿Estás seguro de que deseas eliminar esta variante?',
        confirmText: 'Eliminar',
        action: () => {
          this._removeVariantAtIndex(index);
        }
      });
    } else {
      this._removeVariantAtIndex(index);
    }
  }

  private _removeVariantAtIndex(index: number) {
    const group = this.variants.at(index);
    const id = group?.get('id')?.value;

    this.variants.removeAt(index);
    
    if (id) {
      this.expandedVariants.update(set => {
        const newSet = new Set(set);
        newSet.delete(id);
        return newSet;
      });
    }
  }

  toggleVariant(id: string) {
    this.expandedVariants.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  isVariantExpanded(id: string): boolean {
    return this.expandedVariants().has(id);
  }

  setPriceMode(mode: PriceMode) {
    if (mode === 'variant' && this.priceMode() === 'simple' && this.isEditMode()) {
      this.feedback.confirmAndExecute({
        title: 'Cambiar a variantes',
        message: `El producto "${this.productForm.get('nombre')?.value}" tiene precio simple. ¿Estás seguro de que deseas agregarle variantes?`,
        confirmText: 'Sí, cambiar',
        action: () => {
          this.priceMode.set('variant');
          if (this.variants.length === 0) {
            this.addVariant();
          }
        }
      });
      return;
    }

    this.priceMode.set(mode);
    
    if (mode === 'simple') {
      this.variants.clear();
      this.expandedVariants.set(new Set());
    }
  }

  toggleField(field: 'disponible' | 'visible') {
    const currentValue = this.productForm.get(field)?.value;
    this.productForm.get(field)?.patchValue(!currentValue);
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.selectedFile.set(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      this.productForm.get('productImage')?.setValue(file.name);
    } else {
      this.selectedFile.set(null);
      this.imagePreviewUrl.set(null);
      this.productForm.get('productImage')?.setValue('');
    }
  }

  async removeImage() {
    if (this.isEditMode() && this.imagePreviewUrl() && !this.selectedFile()) {
      this.feedback.confirmAndExecute({
        title: 'Quitar imagen',
        message: 'La imagen se quitará localmente. Haz clic en "Guardar cambios" para eliminarla definitivamente de la base de datos.',
        confirmText: 'Entendido, quitar',
        action: () => {
          this.imageRemoved.set(true);
          this.selectedFile.set(null);
          this.imagePreviewUrl.set(null);
          this.productForm.get('productImage')?.setValue('');
        }
      });
    } else {
      this.imageRemoved.set(true);
      this.selectedFile.set(null);
      this.imagePreviewUrl.set(null);
      this.productForm.get('productImage')?.setValue('');
    }
  }

  private removeEmptyVariants() {
    const variantsArray = this.variants;
    for (let i = variantsArray.length - 1; i >= 0; i--) {
      const group = variantsArray.at(i) as FormGroup;
      const nombre = group.get('nombre')?.value;
      const precio = group.get('precio')?.value;
      const descuento = group.get('descuento')?.value;
      const costo = group.get('costo')?.value;
      const embalaje = group.get('embalaje')?.value;
      const sku = group.get('sku')?.value;
      const isEmpty =
        (!nombre || nombre.toString().trim() === '') &&
        (precio == null || precio === 0) &&
        (descuento == null || descuento === 0) &&
        (costo == null || costo === 0) &&
        (!embalaje || embalaje.toString().trim() === '') &&
        (!sku || sku.toString().trim() === '');
      if (isEmpty) {
        variantsArray.removeAt(i);
      }
    }
  }

  async submitForm() {
    this.removeEmptyVariants();
    
    if (this.productForm.invalid) {
      this.logger.warn('Form is invalid. Cannot save changes.', { form: this.productForm.value }, 'ProductForm');
      this.productForm.markAllAsTouched();
      this.feedback.showError('Por favor, corrige los errores en el formulario');
      return;
    }

    this.isSaving.set(true); 
    const rawValue = this.productForm.getRawValue();

    try {
      if (this.isEditMode()) {
        const productId = this.productId();
        if (!productId) throw new Error("ID de producto no encontrado");

        const updatedProductData: UpdateProductDto = {
          nombre: rawValue.nombre,
          descripcion: rawValue.descripcion,
          precio: rawValue.precio,
          descuento: rawValue.descuento,
          costo: rawValue.costo,
          embalaje: rawValue.embalaje || undefined,
          sku: rawValue.sku,
          price_type: this.priceMode() === 'variant' ? 'variants' : 'simple',
          disponible: rawValue.disponible,
          visible: rawValue.visible,
          variants: this.priceMode() === 'variant' ? rawValue.variants.map((v: any) => ({
            id: v.id,
            nombre: v.nombre,
            precio: v.precio,
            descuento: v.descuento,
            costo: v.costo,
            embalaje: v.embalaje,
            sku: v.sku,
            disponible: v.disponible
          })) : undefined,
        };

        if (this.selectedFile()) {
          updatedProductData.images = [this.selectedFile()!];
        } else if (this.imageRemoved()) {
          updatedProductData.images = [];
        }

        await this.productsService.updateProduct(productId, updatedProductData);
        this.feedback.showSuccess('Producto actualizado exitosamente');

      } else {
        // Create Mode
        const dto: CreateProductDto = {
          nombre: rawValue.nombre,
          descripcion: rawValue.descripcion,
          categoria_id: this.categoriaId() ?? undefined,
          price_type: this.priceMode() === 'variant' ? 'variants' : 'simple',
          disponible: rawValue.disponible,
          visible: rawValue.visible,
        };

        if (this.priceMode() === 'simple') {
          dto.precio = rawValue.precio;
          dto.descuento = rawValue.descuento;
          dto.costo = rawValue.costo;
          dto.embalaje = rawValue.embalaje;
          dto.sku = rawValue.sku;
        } else if (this.variants.length > 0) {
          dto.variants = rawValue.variants.map((v: any) => ({
            nombre: v.nombre,
            precio: v.precio,
            descuento: v.descuento,
            costo: v.costo,
            embalaje: v.embalaje,
            sku: v.sku,
            disponible: v.disponible,
          }));
        }

        if (this.selectedFile()) {
          dto.images = [this.selectedFile()!];
        }

        const validationError = this.productsService.validateCreateDto(dto);
        if (validationError) {
          this.feedback.showError(validationError);
          this.isSaving.set(false);
          return;
        }

        await this.productsService.createProduct(dto);
        this.feedback.showSuccess('Producto creado correctamente');
      }

      this.dialogRef.close(true);

    } catch (err: any) {
      this.logger.error('Error saving product', err, 'ProductForm');
      this.feedback.showError('Error al guardar el producto');
    } finally {
      this.isSaving.set(false); 
    }
  }

  isInvalidAndTouched(control: AbstractControl | null): boolean {
    return control ? control.invalid && (control.touched || control.dirty) : false;
  }

  closeModal() {
    this.dialogRef.close();
  }
}
