import { Injectable, signal, computed } from '@angular/core';
import { OrderCreateItem } from '@core/models/order.model';

@Injectable({ providedIn: 'root' })
export class CartState {
  readonly cart = signal<(OrderCreateItem & { tempId: string })[]>([]);
  readonly cartCount = computed(() => this.cart().reduce((acc, i) => acc + i.cantidad, 0));

  private generateTempId() {
    return Math.random().toString(36).substring(2, 9);
  }

  addProduct(product: { id: string | number; nombre: string }) { 
    this.cart.update(items => { 
      const i = items.findIndex(x => x.producto_id === product.id && !x.variante_id && (!x.modificadores || x.modificadores.length === 0)); 
      if (i !== -1) { 
        const updated = [...items]; 
        updated[i] = { ...updated[i], cantidad: updated[i].cantidad + 1 }; 
        return updated; 
      } 
      return [...items, { 
        tempId: this.generateTempId(),
        producto_id: product.id, 
        nombre_producto: product.nombre, 
        cantidad: 1, 
        modificadores: [] 
      }]; 
    }); 
  }

  addVariant(variant: { id: string | number; nombre: string }, product: { id: string | number; nombre: string }) {
    this.cart.update(items => {
      const i = items.findIndex(x => x.variante_id === variant.id && (!x.modificadores || x.modificadores.length === 0));
      if (i !== -1) { 
        const updated = [...items]; 
        updated[i] = { ...updated[i], cantidad: updated[i].cantidad + 1 }; 
        return updated; 
      }
      return [...items, { 
        tempId: this.generateTempId(),
        variante_id: variant.id, 
        producto_id: product.id, 
        nombre_producto: `${product.nombre} - ${variant.nombre}`, 
        cantidad: 1, 
        modificadores: [] 
      }];
    });
  }
  
  increment(item: OrderCreateItem & { tempId: string }) { this.cart.update(items => items.map(i => i.tempId === item.tempId ? { ...i, cantidad: i.cantidad + 1 } : i)); }
  decrement(item: OrderCreateItem & { tempId: string }) { this.cart.update(items => item.cantidad > 1 ? items.map(i => i.tempId === item.tempId ? { ...i, cantidad: i.cantidad - 1 } : i) : items.filter(i => i.tempId !== item.tempId)); }
  remove(item: OrderCreateItem & { tempId: string }) { this.cart.update(items => items.filter(i => i.tempId !== item.tempId)); }
  clearCart() { this.cart.set([]); }
}
