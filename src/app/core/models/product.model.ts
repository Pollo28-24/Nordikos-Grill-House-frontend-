export interface ModifierCategory {
  id: string | number;
  nombre: string;
  descripcion?: string;
  visible: boolean;
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
  cantidad_maxima: number;
  modificador_categorias?: { nombre: string }; // Para joins
}

export interface ProductVariant {
  id: string;
  producto_id: string;
  nombre: string;
  precio: number;
  costo?: number;
  descuento?: number;
  sku?: string;
  embalaje?: string;
  disponible: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductVariantCreateDto extends Omit<ProductVariant, 'id' | 'producto_id' | 'created_at' | 'updated_at' | 'disponible'> {
  // 'nombre' y 'precio' son requeridos aquí
  disponible?: boolean; // Puede ser opcional para la creación, el servicio puede establecer un valor por defecto
}

export type ProductVariantUpdateDto = Partial<Omit<ProductVariant, 'created_at' | 'updated_at'>>;

export interface ProductImage {
  id: string;
  producto_id: string;
  url: string;
}

export interface Product {
  id: string;
  categoria_id?: string;
  nombre: string;
  descripcion?: string;
  precio?: number;
  price_type?: string;
  sku?: string;
  costo?: number;
  descuento?: number;
  embalaje?: number;
  disponible?: boolean;
  visible?: boolean;
  stock?: number;
  imagen_url?: string; // Añadido para compatibilidad
  images?: ProductImage[];
  variants?: ProductVariant[];
  modifiers?: Modifier[];
  created_at: string;
  updated_at: string;
}

export interface CreateProductDto extends Omit<Product, 'id' | 'created_at' | 'updated_at' | 'images' | 'variants'> {
  images?: File[];
  variants?: ProductVariantCreateDto[];
}

export interface UpdateProductDto extends Partial<Omit<Product, 'id' | 'created_at' | 'updated_at' | 'images' | 'variants'>> {
  images?: (File | ProductImage)[];
  variants?: ProductVariantUpdateDto[];
}

