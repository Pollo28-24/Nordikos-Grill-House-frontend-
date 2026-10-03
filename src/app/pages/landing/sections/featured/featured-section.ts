import { ChangeDetectionStrategy, Component, inject, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';
import { ProductsService } from '@core/services/products.service';

export interface FeaturedDish {
  id?: number | string;
  name: string;
  badge?: string;
  desc: string;
  price: string;
  image: string;
  categoryId?: number | string | null;
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

  // Real Database Signature IDs:
  // 40: Gran Nórdica Doble ($105)
  // 48: Vikinga 1/4 de Libra ($90)
  // 59: Baguette Mediterráneo ($90)
  // 49: Spicy Crispy Chicken ($90)
  private readonly signatureIds = [40, 48, 59, 49];

  dishes = computed<FeaturedDish[]>(() => {
    const allProducts = this.productsService.products();

    // Fallback con los productos reales registrados en la base de datos
    const defaultDishes: FeaturedDish[] = [
      {
        id: 40,
        name: 'Gran Nórdica Doble',
        badge: 'SIGNATURE',
        desc: 'Doble carne de res, aderezo de la casa, queso americano, pepinillos, queso fundido y cebolla confitada.',
        price: '$105',
        image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/ec479dc7-1483-4ff3-b4c8-73271c24bd5a.webp',
        categoryId: 4
      },
      {
        id: 48,
        name: 'Vikinga 1/4 de Libra',
        badge: 'ESPECIALIDAD',
        desc: 'Carne de res 1/4 libra, aderezo delux, salchichón asadero, chimichurri, cheddar, cebollas caramelizadas, BBQ y tocino ahumado.',
        price: '$90',
        image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/e6f921e1-3237-4ca4-81c9-b41044cf787e.webp',
        categoryId: 5
      },
      {
        id: 59,
        name: 'Baguette Mediterráneo',
        badge: 'GRILLADO',
        desc: 'Chistorra española grillada, queso fundido, mermelada de cebolla, tomate tatemado y aceite de oliva.',
        price: '$90',
        image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/cacbab11-cd61-420e-b39a-4f77cc3fce0e.webp',
        categoryId: 6
      },
      {
        id: 49,
        name: 'Spicy Crispy Chicken',
        badge: 'CRISPY',
        desc: 'Fajitas de pollo crujientes, aderezo delux, relish, ensalada de col, queso fundido y pepinillos.',
        price: '$90',
        image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/5ad8ec48-3904-4384-a574-aa0597834f21.webp',
        categoryId: 5
      }
    ];

    if (!allProducts || allProducts.length === 0) {
      return defaultDishes;
    }

    // Mapear dinámicamente si los productos ya están en memoria desde Supabase
    const foundDishes: FeaturedDish[] = [];
    for (const sigId of this.signatureIds) {
      const p = allProducts.find(prod => Number(prod.id) === sigId);
      if (p) {
        const fallback = defaultDishes.find(d => Number(d.id) === sigId);
        const rawP = p as any;
        const img = p.imagen_url || p.images?.[0]?.url || rawP.foto_principal || fallback?.image || 'assets/Galeria/iamgen publicidad.jpg';
        foundDishes.push({
          id: p.id,
          name: p.nombre,
          badge: fallback?.badge ?? 'FAVORITO',
          desc: p.descripcion || fallback?.desc || '',
          price: `$${p.precio}`,
          image: img,
          categoryId: p.categoria_id ?? null
        });
      }
    }

    return foundDishes.length >= 4 ? foundDishes : defaultDishes;
  });
}
