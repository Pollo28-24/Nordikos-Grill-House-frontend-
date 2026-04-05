import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Component, ChangeDetectionStrategy, inject, signal, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { LucideAngularModule } from "lucide-angular";
import { Product, ProductVariant, UpdateProductDto } from '../../../core/models/product.model';
import { ProductsService } from '../../../core/services/products.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { LoggerService } from '../../../core/services/logger.service';
import { DecimalPipe } from '@angular/common';

type PriceMode = 'simple' | 'variant';

@Component({
  imports: [ LucideAngularModule, ReactiveFormsModule, DecimalPipe, RouterLink], 
  templateUrl: './editProducts.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProducts {
  private productsService = inject(ProductsService);
  private toastService = inject(ToastService);
  private confirmService = inject(ConfirmService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private logger = inject(LoggerService);

  private routeId = toSignal(
    this.route.paramMap.pipe(map(params => params.get('id')))
  );

  product = signal<Product | null>(null);
  
  expandedVariants = signal<Set<string>>(new Set());

  priceMode = signal<PriceMode>('simple');
  selectedFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  isSaving = signal(false);

  productForm: FormGroup;

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
      const id = this.routeId();
      if (id) {
        this.loadProduct(id);
      }
    });
  }

  private createVariantFormGroup(variant?: ProductVariant): FormGroup {
    return this.fb.group({
      id: [variant?.id || crypto.randomUUID()],
      nombre: [variant?.nombre || '', Validators.required],
      precio: [variant?.precio || 0, [Validators.required, Validators.min(0)]],
      descuento: [variant?.descuento || 0, [Validators.min(0)]],
      costo: [variant?.costo || 0, [Validators.min(0)]],
      embalaje: [variant?.embalaje || ''],
      sku: [variant?.sku || ''],
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
        this.toastService.show('Producto no encontrado', 'error');
      }
    } catch (error) {
      this.logger.error('Error loading product', error, 'EditProducts');
      this.toastService.show('Error al cargar el producto', 'error');
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
    this.confirmService.open({
      title: 'Eliminar variante',
      message: '¿Estás seguro de que deseas eliminar esta variante?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      onConfirm: () => {
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
    });
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
    this.priceMode.set(mode);
    
    if (mode === 'simple') {
      this.variants.clear();
      this.expandedVariants.set(new Set());
    }
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
    const imageUrl = this.productForm.get('productImage')?.value;
    if (imageUrl) {
      try {
        await this.productsService.deleteImage(imageUrl);
        this.toastService.show('Imagen eliminada correctamente', 'success');
      } catch (error) {
        this.logger.error('Error deleting image from storage', error, 'EditProducts');
        this.toastService.show('Error al eliminar la imagen', 'error');
      }
    }
    this.selectedFile.set(null);
    this.imagePreviewUrl.set(null);
    this.productForm.get('productImage')?.setValue('');
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

  async saveChanges() {
    this.isSaving.set(true); 
    this.removeEmptyVariants();
    
    if (this.productForm.invalid) {
      this.logger.warn('Form is invalid. Cannot save changes.', { form: this.productForm.value }, 'EditProducts');
      this.productForm.markAllAsTouched();
      this.toastService.show('Por favor, corrige los errores en el formulario', 'error');
      this.isSaving.set(false); 
      return;
    }

    const productId = this.product()?.id;
    if (!productId) {
      this.logger.error('Product ID is missing', null, 'EditProducts');
      this.toastService.show('Error: ID del producto no encontrado', 'error');
      this.isSaving.set(false); 
      return;
    }

    const rawValue = this.productForm.getRawValue();
    
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
      variants: rawValue.variants.map((v: any) => ({
        id: v.id,
        nombre: v.nombre,
        precio: v.precio,
        descuento: v.descuento,
        costo: v.costo,
        embalaje: v.embalaje,
        sku: v.sku,
      })),
    };

    if (this.selectedFile()) {
      updatedProductData.images = [this.selectedFile()!];
    }

    try {
      const updatedProduct = await this.productsService.updateProduct(productId, updatedProductData);
      this.product.set(updatedProduct);
      this.toastService.show('Producto actualizado exitosamente', 'success');
    } catch (err: any) {
      this.logger.error('Error updating product', err, 'EditProducts');
      this.toastService.show('Error al actualizar el producto', 'error');
    } finally {
      this.isSaving.set(false); 
    }
  }

  isInvalidAndTouched(control: AbstractControl | null): boolean {
    return control ? control.invalid && (control.touched || control.dirty) : false;
  }
}
