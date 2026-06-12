import { ChangeDetectionStrategy, Component, inject, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';
import { ProductsService } from '@core/services/products.service';

interface FeaturedDish {
  name: string;
  desc: string;
  price: string;
  image: string;
}

@Component({
  selector: 'app-featured-section',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective],
  templateUrl: './featured-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturedSection implements OnInit {
  private productsService = inject(ProductsService);

  ngOnInit() {
    this.productsService.reload();
  }

  dishes = computed<FeaturedDish[]>(() => {
    const allProducts = this.productsService.products().filter(p => p.visible !== false);
    const topProducts = allProducts.slice(0, 3);
    
    if (topProducts.length === 0) {
      return [
        {
          name: 'Hamburguesa Nórdicos',
          desc: 'Doble carne de res premium al grill, queso cheddar fundido, tocino crujiente, cebolla caramelizada y aderezo especial de la casa en pan brioche horneado diario.',
          price: '$165',
          image: 'assets/Galeria/iamgen publicidad.jpg'
        },
        {
          name: 'Costillas BBQ Premium',
          desc: 'Costillas de cerdo seleccionadas, ahumadas a fuego lento con leña de encino durante 6 horas, bañadas en nuestra salsa barbecue artesanal de autor.',
          price: '$220',
          image: 'assets/Galeria/imagen publicidad 2.jpg'
        },
        {
          name: 'Corte Tomahawk',
          desc: 'Corte premium de excelente marmoleo y gran grosor, asado a la parrilla sobre brasas ardientes para conservar su extrema jugosidad y terneza.',
          price: '$480',
          image: 'assets/Galeria/iamgen publicidad 3.jpg'
        }
      ];
    }

    return topProducts.map(p => ({
      name: p.nombre,
      desc: p.descripcion || 'Preparados al instante con fuego real y pasión artesanal.',
      price: p.price_type === 'variants' && p.variants && p.variants.length > 0
        ? `$${p.variants[0].precio}`
        : `$${p.precio}`,
      image: p.imagen_url || 'assets/Galeria/iamgen publicidad.jpg'
    }));
  });
}
