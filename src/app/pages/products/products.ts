import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Navbar } from "../../componentes/shared/navbar/navbar";
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-products',
  imports: [Navbar, ],
  templateUrl: './products.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Products {
  categories = [
  {
    id: 1,
    name: 'Hamburguesas Artesanales',
    open: true,
    products: [
      {
        id: 1,
        name: 'Clásica',
        price: 65,
        image: '...',
        active: true
      }
    ]
  }
];

 }
