export type ModifierSelectionType = 'RADIO' | 'CHECKBOX' | 'STEPPER';

export interface ModifierCategory {
  id: string | number;
  nombre: string;
  descripcion?: string | null;
  visible: boolean;
  // Reglas estrictas garantizadas por el mapper (sin undefineds en el dominio)
  tipo_seleccion: ModifierSelectionType;
  min_selections: number;
  max_selections: number;
  obligatorio: boolean;
  orden_visual: number;
  created_at?: string;
  updated_at?: string;
}

export interface Modifier {
  id: string | number;
  categoria_id?: string | number;
  nombre: string;
  precio: number;
  costo?: number;
  descuento?: number;
  sku?: string;
  visible: boolean;
  disponible: boolean;
  cantidad_maxima: number;
  modificador_categorias?: ModifierCategory;
}

export interface CreateModifierDto {
  nombre: string;
  categoria_id: string | number;
  precio: number;
  costo?: number;
  descuento?: number;
  cantidad_maxima: number;
  visible: boolean;
  disponible: boolean;
  sku?: string;
}

export type UpdateModifierDto = Partial<CreateModifierDto>;


export interface SelectedModifierItem {
  modifierId: string | number;
  categoryId: string | number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  modifier: Modifier; // Referencia/snapshot completa
}

export interface CartCustomization {
  product: Product;
  variant?: ProductVariant | null;
  quantity: number;
  modifiers: SelectedModifierItem[];
  note?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProductVariant {
  id: string;
  producto_id: string;
  nombre: string;
  precio: number;
  costo?: number;
  descuento?: number;
  sku?: string;
  embalaje?: string; // character varying en BD
  disponible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantCreateDto extends Omit<ProductVariant, 'id' | 'producto_id' | 'created_at' | 'updated_at' | 'disponible'> {
  disponible?: boolean;
}

export type ProductVariantUpdateDto = Partial<Omit<ProductVariant, 'created_at' | 'updated_at'>>;

export interface ProductImage {
  id: string;
  producto_id: string;
  url: string;
}

export interface Product {
  id: string;
  categoria_id?: string | number | null;
  nombre: string;
  descripcion?: string;
  precio?: number | null;
  price_type: 'simple' | 'variants';
  sku?: string | null;
  costo?: number | null;
  descuento?: number | null;
  embalaje?: string | null; // character varying en BD
  disponible?: boolean;
  visible?: boolean;
  orden?: number;
  // Campo calculador - primera foto del producto
  imagen_url?: string; 
  images?: ProductImage[];
  variants?: ProductVariant[];
  modifiers?: Modifier[];
  created_at: string;
  updated_at: string;
}

export interface CreateProductDto extends Omit<Product, 'id' | 'created_at' | 'updated_at' | 'images' | 'variants' | 'imagen_url' | 'modifiers'> {
  disponible?: boolean;
  visible?: boolean;
  images?: File[];
  variants?: ProductVariantCreateDto[];
}

export interface UpdateProductDto extends Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'images' | 'variants' | 'imagen_url' | 'modifiers'>> {
  disponible?: boolean;
  visible?: boolean;
  images?: (File | ProductImage)[];
  variants?: (ProductVariant | ProductVariantCreateDto)[];
}
