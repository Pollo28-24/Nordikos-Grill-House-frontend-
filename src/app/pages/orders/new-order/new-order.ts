import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed
} from '@angular/core';

import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { OrdersService } from '@core/services/orders.service';
import { ProductsService } from '@core/services/products.service';
import { NewOrderCart } from './cart/cart';

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    LucideAngularModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NewOrderCart
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-order.html'
})
export class NewOrder {

  public ordersService = inject(OrdersService);
  public productsService = inject(ProductsService);

  cart = this.ordersService.cart;
  editingOrderId = this.ordersService.editingOrderId;

  cartCount = computed(() =>
    this.cart().reduce(
      (acc, item) => acc + (item.cantidad ?? 0),
      0
    )
  );

  cartTotal = computed(() => {
    const prods = this.productsService.products();
    let total = 0;
    for (const item of this.cart()) {
      let basePrice = 0;
      if (item.variante_id != null) {
        for (const p of prods) {
          const v = (p?.variants ?? []).find((vv: any) => String(vv.id) === String(item.variante_id));
          if (v) { basePrice = Number(v.precio ?? 0); break; }
        }
      } else if (item.producto_id != null) {
        const p = prods.find((pp: any) => String(pp.id) === String(item.producto_id));
        if (p) basePrice = Number(p.precio ?? 0);
      }
      const modsPrice = (item.modificadores || []).reduce((acc: number, m: any) => acc + (Number(m.precio_unitario || 0) * Number(m.cantidad || 1)), 0);
      total += (basePrice + modsPrice) * Number(item.cantidad ?? 0);
    }
    return total;
  });

  navToBrowse() {
    // Logic for browse button
  }

}
