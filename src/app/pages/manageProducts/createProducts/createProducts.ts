import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { DecimalPipe } from '@angular/common';
import { ProductsService } from '@core/services/products.service';
import { UserFeedbackService } from '@core/services/user-feedback.service';
import { CreateProductDto, ProductVariantCreateDto } from '@core/models/product.model';

type PriceMode = 'simple' | 'variant';

@Component({
  selector: 'app-create-products',
  imports: [LucideAngularModule, ReactiveFormsModule, DecimalPipe, RouterLink],
  templateUrl: './createProducts.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateProducts {
  private productsService = inject(ProductsService);
  private feedback = inject(UserFeedbackService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  priceMode = signal<PriceMode>('simple');
  selectedFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);
  isSaving = signal(false);

  // Signal-driven query param
  categoriaId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('categoria_id'))),
    { initialValue: null },
  );

  productForm: FormGroup;

  constructor() {
    this.productForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
      precio: [0, [Validators.required, Validators.min(0)]],
      descuento: [0, [Validators.min(0)]],
      costo: [0, [Validators.min(0)]],
      embalaje: [0, [Validators.min(0)]],
      sku: [''],
      productImage: [''],
      disponible: [true],
      visible: [true],
      variants: this.fb.array([]),
    });
  }

  get variants() {
    return this.productForm.get('variants') as FormArray<FormGroup>;
  }

  private createVariantFormGroup(variant?: ProductVariantCreateDto): FormGroup {
    return this.fb.group({
      nombre: [variant?.nombre || '', Validators.required],
      precio: [variant?.precio || 0, [Validators.required, Validators.min(0)]],
      descuento: [variant?.descuento || 0, [Validators.min(0)]],
      costo: [variant?.costo || 0, [Validators.min(0)]],
      embalaje: [variant?.embalaje || 0, [Validators.min(0)]],
      sku: [variant?.sku || ''],
      disponible: [variant?.disponible ?? true],
    });
  }

  addVariant() {
    this.variants.push(this.createVariantFormGroup());
  }

  removeVariant(index: number) {
    this.variants.removeAt(index);
  }

  setPriceMode(mode: PriceMode) {
    this.priceMode.set(mode);
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

  private removeEmptyVariants() {
    const variantsArray = this.variants;
    for (let i = variantsArray.length - 1; i >= 0; i--) {
      const group = variantsArray.at(i) as FormGroup;
      const nombre = group.get('nombre')?.value;
      
      // Validation more flexible: only remove if name is empty
      const isEmpty = !nombre || nombre.toString().trim() === '';
      
      if (isEmpty) {
        variantsArray.removeAt(i);
      }
    }
  }

  async createProduct() {
    this.removeEmptyVariants();
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.feedback.showError('Formulario inválido. Revisa los campos marcados.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.productForm.value;

    const dto: CreateProductDto = {
      nombre: formValue.nombre,
      descripcion: formValue.descripcion,
      categoria_id: this.categoriaId() ?? undefined,
      price_type: this.priceMode() === 'variant' ? 'variants' : 'simple',
      disponible: formValue.disponible,
      visible: formValue.visible,
    };

    if (this.priceMode() === 'simple') {
      dto.precio = formValue.precio;
      dto.descuento = formValue.descuento;
      dto.costo = formValue.costo;
      dto.embalaje = formValue.embalaje;
      dto.sku = formValue.sku;
    } else if (this.variants.length > 0) {
      const variantsDto: ProductVariantCreateDto[] = this.variants.controls.map(
        (group: AbstractControl) => {
          const value = group.value;
          return {
            nombre: value.nombre,
            precio: value.precio,
            descuento: value.descuento,
            costo: value.costo,
            embalaje: value.embalaje,
            sku: value.sku,
            disponible: value.disponible,
          };
        },
      );
      dto.variants = variantsDto;
      // In variant mode, we don't send the simple price
      delete dto.precio;
    }

    if (this.selectedFile()) {
      dto.images = [this.selectedFile()!];
    }

    try {
      const validationError = this.productsService.validateCreateDto(dto);
      if (validationError) {
        console.error('Validation error:', validationError);
        this.feedback.showError(validationError);
        this.isSaving.set(false);
        return;
      }

      await this.productsService.createProduct(dto);
      this.feedback.showSuccess('Producto creado correctamente');
      this.router.navigate(['/products'], {
        queryParams: { categoria_id: this.categoriaId() ?? null },
      });
    } catch (error) {
      console.error('Error creating product:', error);
      this.feedback.showError('Error al crear el producto');
    } finally {
      this.isSaving.set(false);
    }
  }

  isInvalidAndTouched(control: AbstractControl | null): boolean {
    return control ? control.invalid && (control.touched || control.dirty) : false;
  }
}
