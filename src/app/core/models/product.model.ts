export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  category?: string;
  image_url?: string;
  stock?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
