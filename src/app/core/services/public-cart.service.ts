import { Injectable, signal, computed, effect } from '@angular/core';
import { Product, ProductVariant, CartCustomization } from '../models/product.model';
import { CartItem, normalizeCartItem, OrderCreateModifier } from '../models/order.model';

export type { CartItem };

function areModifiersEqual(a: OrderCreateModifier[], b: OrderCreateModifier[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x.nombre_modificador.localeCompare(y.nombre_modificador));
  const sortedB = [...b].sort((x, y) => x.nombre_modificador.localeCompare(y.nombre_modificador));
  return sortedA.every((modA, i) => 
    modA.nombre_modificador === sortedB[i].nombre_modificador && 
    modA.cantidad === sortedB[i].cantidad && 
    (modA.precio_unitario || 0) === (sortedB[i].precio_unitario || 0)
  );
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
    this._items().reduce((acc, item) => acc + ((item.precio_total_unitario ?? item.precio_unitario ?? item.precio ?? 0) * item.cantidad), 0)
  );

  constructor() {
    // Load from local storage if available with backward-compatible normalization
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            this._items.set(parsed.map(i => normalizeCartItem(i)));
          }
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

  addCustomizedProduct(customization: CartCustomization) {
    const { product, variant, quantity, modifiers, note } = customization;
    const mods: OrderCreateModifier[] = (modifiers || []).map(m => ({
      modificador_id: m.modifierId,
      nombre_modificador: m.nombre,
      cantidad: m.cantidad,
      precio_unitario: m.precioUnitario
    }));

    const basePrice = variant 
      ? (variant.precio - (variant.descuento || 0)) 
      : ((product.precio || 0) - (product.descuento || 0));
    
    const modsPrice = mods.reduce((sum, m) => sum + (Number(m.precio_unitario || 0) * Number(m.cantidad || 1)), 0);
    const unitPrice = basePrice + modsPrice;

    const items = [...this._items()];
    
    // Check if an identical item exists (same product, same variant, same note, same modifiers)
    const existingIndex = items.findIndex(i => 
      String(i.producto_id ?? i.product_id) === String(product.id) &&
      (!variant || String(i.variante_id ?? i.variante?.id) === String(variant.id)) &&
      (i.nota || null) === (note || null) &&
      areModifiersEqual(i.modificadores || [], mods)
    );

    if (existingIndex > -1) {
      items[existingIndex] = {
        ...items[existingIndex],
        cantidad: items[existingIndex].cantidad + quantity
      };
    } else {
      const newItem: CartItem = normalizeCartItem({
        cart_item_id: crypto.randomUUID(),
        producto_id: product.id,
        nombre_producto: product.nombre,
        precio_base: basePrice,
        precio_modificadores: modsPrice,
        precio_total_unitario: unitPrice,
        precio_unitario: unitPrice,
        precio: unitPrice,
        precio_original: variant ? variant.precio : (product.precio || 0),
        descuento: variant ? (variant.descuento || 0) : (product.descuento || 0),
        cantidad: quantity,
        imagen_url: product.imagen_url,
        variante_id: variant?.id,
        nombre_variante: variant?.nombre,
        variante: variant ? {
          id: String(variant.id),
          nombre: variant.nombre,
          precio: variant.precio
        } : undefined,
        nota: note || null,
        modificadores: mods
      });
      items.push(newItem);
    }

    this._items.set(items);
  }

  addToCart(
    product: Product,
    variant?: ProductVariant,
    cantidad: number = 1,
    nota?: string,
    modificadores: OrderCreateModifier[] = []
  ) {
    const items = [...this._items()];
    const mods = modificadores || [];

    // Check if item with same product, variant and modifiers already exists
    const existingIndex = mods.length === 0 ? items.findIndex(i => 
      String(i.producto_id ?? i.product_id) === String(product.id) && 
      (!variant || String(i.variante_id ?? i.variante?.id) === String(variant.id)) &&
      (!i.modificadores || i.modificadores.length === 0)
    ) : -1;

    if (existingIndex > -1) {
      items[existingIndex] = {
        ...items[existingIndex],
        cantidad: items[existingIndex].cantidad + cantidad,
        nota: nota || items[existingIndex].nota
      };
    } else {
      const basePrice = variant ? (variant.precio - (variant.descuento || 0)) : ((product.precio || 0) - (product.descuento || 0));
      const modsPrice = mods.reduce((sum, m) => sum + (Number(m.precio_unitario || 0) * Number(m.cantidad || 1)), 0);
      const unitPrice = basePrice + modsPrice;

      const newItem: CartItem = normalizeCartItem({
        cart_item_id: crypto.randomUUID(),
        producto_id: product.id,
        nombre_producto: product.nombre,
        precio_base: basePrice,
        precio_modificadores: modsPrice,
        precio_total_unitario: unitPrice,
        precio_unitario: unitPrice,
        precio: unitPrice,
        precio_original: variant ? variant.precio : (product.precio || 0),
        descuento: variant ? (variant.descuento || 0) : (product.descuento || 0),
        cantidad: cantidad,
        imagen_url: product.imagen_url,
        variante_id: variant?.id,
        nombre_variante: variant?.nombre,
        variante: variant ? {
          id: String(variant.id),
          nombre: variant.nombre,
          precio: variant.precio
        } : undefined,
        nota: nota || null,
        modificadores: mods
      });
      items.push(newItem);
    }

    this._items.set(items);
  }

  updateNota(itemId: string, nota: string) {
    const items = [...this._items()];
    const index = items.findIndex(i => i.cart_item_id === itemId || i.id === itemId);
    
    if (index > -1) {
      items[index] = { ...items[index], nota: nota };
      this._items.set(items);
    }
  }

  removeFromCart(itemId: string) {
    this._items.set(this._items().filter(i => i.cart_item_id !== itemId && i.id !== itemId));
  }

  updateQuantity(itemId: string, delta: number) {
    const items = [...this._items()];
    const index = items.findIndex(i => i.cart_item_id === itemId || i.id === itemId);
    
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

    let message = `*Nuevo pedido - Nórdicos Grill House*\n\n`;
    
    this._items().forEach(item => {
      const variantStr = item.nombre_variante ? ` (${item.nombre_variante})` : (item.variante ? ` (${item.variante.nombre})` : '');
      const unit = item.precio_total_unitario ?? item.precio_unitario ?? item.precio ?? 0;
      message += `*${item.cantidad}x ${item.nombre_producto}${variantStr}* - $${(unit * item.cantidad).toFixed(2)}\n`;
      
      if (item.modificadores && item.modificadores.length > 0) {
        message += `  Extras:\n`;
        item.modificadores.forEach(m => {
          const qtyStr = m.cantidad > 1 ? ` x${m.cantidad}` : '';
          const priceStr = (m.precio_unitario && m.precio_unitario > 0) 
            ? ` (+$${(m.precio_unitario * m.cantidad).toFixed(2)})` 
            : '';
          message += `  • ${m.nombre_modificador}${qtyStr}${priceStr}\n`;
        });
      }

      if (item.nota) {
        message += `  Nota: "${item.nota}"\n`;
      }
      message += `\n`;
    });

    message += `*Total: $${this.totalAmount().toFixed(2)}*\n\n_Pedido generado desde el menú digital._`;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${businessPhone}?text=${encodedMessage}`;
  }
}
