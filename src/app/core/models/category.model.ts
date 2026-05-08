export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  visible?: boolean;
  orden?: number;
  created_at: string;
  updated_at: string;
  products_count?: number;
}

export type CategoryWithCount = Category & {
  productos?: { count: number }[];
};
