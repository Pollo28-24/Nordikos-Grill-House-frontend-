import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CartItem } from '@core/services/public-cart.service';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { ClientOrdersService } from '@core/services/client-orders.service';

@Component({
  selector: 'app-public-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, CurrencyMxnPipe],
  templateUrl: './public-cart.html',
  styles: [`
    .cart-backdrop {
      background-color: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
    }
  `]
})
export class PublicCart {
  readonly clientOrdersService = inject(ClientOrdersService);

  items     = input<CartItem[]>([]);
  total     = input<number>(0);

  close          = output<void>();
  quantityChange = output<{ id: string; delta: number }>();
  remove         = output<string>();
  clear          = output<void>();
  checkout       = output<void>();
  notaChange     = output<{ id: string; nota: string }>();
  viewOrders     = output<void>();
}
