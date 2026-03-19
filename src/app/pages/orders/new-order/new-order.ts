import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

import { OrdersService } from '../../../core/services/orders.service';
import { Navbar } from '../../../componentes/shared/navbar/navbar';

@Component({
  selector: 'app-new-order',
  standalone: true,
  imports: [
    CommonModule,
    LucideAngularModule,
    Navbar,
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-order.html'
})
export class NewOrder {

  public ordersService = inject(OrdersService);

  cart = this.ordersService.cart;
  editingOrderId = this.ordersService.editingOrderId;

  cartCount = computed(() =>
    this.cart().reduce(
      (acc, item) => acc + (item.cantidad ?? 0),
      0
    )
  );

  navToBrowse() {
    // Logic for browse button
  }

}
