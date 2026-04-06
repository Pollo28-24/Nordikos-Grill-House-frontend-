import { Injectable, signal, computed, effect } from '@angular/core';
import { Product, ProductVariant } from '../models/product.model';

export interface CartItem {
  id: string; // generated unique id for the cart item
  product_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url?: string;
  variante?: {
    id: string;
    nombre: string;
    precio: number;
  };
  nota?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PublicCartService {
  private readonly STORAGE_KEY = 'nordikos_public_cart';

  // Signals for state management
  private _items = signal<CartItem[]>([]);

  // Computed values
  readonly items = this._items.asReadonly();
  
  readonly totalItems = computed(() => 
    this._items().reduce((acc, item) => acc + item.cantidad, 0)
  );

  readonly totalAmount = computed(() => 
    this._items().reduce((acc, item) => acc + (item.precio * item.cantidad), 0)
  );

  constructor() {
    // Load from local storage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        try {
          this._items.set(JSON.parse(saved));
        } catch (e) {
          console.error('Error parsing cart from storage', e);
        }
      }

      // Save to local storage whenever items change
      effect(() => {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this._items()));
      });
    }
  }

  addToCart(product: Product, variant?: ProductVariant, cantidad: number = 1) {
    const items = [...this._items()];
    
    // Check if item with same product and variant already exists
    const existingIndex = items.findIndex(i => 
      i.product_id === product.id && 
      (!variant || i.variante?.id === variant.id)
    );

    if (existingIndex > -1) {
      items[existingIndex] = {
        ...items[existingIndex],
        cantidad: items[existingIndex].cantidad + cantidad
      };
    } else {
      const newItem: CartItem = {
        id: crypto.randomUUID(),
        product_id: product.id,
        nombre: product.nombre,
        precio: variant ? variant.precio : (product.precio || 0),
        cantidad: cantidad,
        imagen_url: product.imagen_url,
        variante: variant ? {
          id: variant.id,
          nombre: variant.nombre,
          precio: variant.precio
        } : undefined
      };
      items.push(newItem);
    }

    this._items.set(items);
  }

  removeFromCart(itemId: string) {
    this._items.set(this._items().filter(i => i.id !== itemId));
  }

  updateQuantity(itemId: string, delta: number) {
    const items = [...this._items()];
    const index = items.findIndex(i => i.id === itemId);
    
    if (index > -1) {
      const newQty = items[index].cantidad + delta;
      if (newQty <= 0) {
        items.splice(index, 1);
      } else {
        items[index] = { ...items[index], cantidad: newQty };
      }
      this._items.set(items);
    }
  }

  clearCart() {
    this._items.set([]);
  }

  generateWhatsAppMessage(businessPhone: string = '5219512224034'): string {
    if (this._items().length === 0) return '';

    let message = `*Nuevo pedido - Nordikos Grill House*\n\n`;
    
    this._items().forEach(item => {
      const variantStr = item.variante ? ` (${item.variante.nombre})` : '';
      message += `${item.cantidad}x ${item.nombre}${variantStr} - $${item.precio * item.cantidad}\n`;
    });

    message += `\n*Total: $${this.totalAmount()}*\n\n_Pedido generado desde el menú digital._`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${businessPhone}?text=${encodedMessage}`;
  }
}
