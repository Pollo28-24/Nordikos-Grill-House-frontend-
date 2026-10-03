import { ChangeDetectionStrategy, Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';
import { ProductsService } from '@core/services/products.service';

export interface DailySpecialItem {
  id: number | string;
  name: string;
  price: string;
  tagline: string;
  badge: string;
  image: string;
  categoryId?: number | string | null;
}

@Component({
  selector: 'app-menu-categories-section',
  standalone: true,
  imports: [RouterLink, RevealOnScrollDirective],
  templateUrl: './menu-categories-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuCategoriesSection {
  private productsService = inject(ProductsService);

  // Pool de promociones y combos reales de Supabase (Categoría 8: Combos y Promociones)
  private readonly fallbackPromos: DailySpecialItem[] = [
    {
      id: 70,
      name: '2 Vikingas + Papas',
      price: '$220',
      tagline: 'Combo especial con 2 hamburguesas Vikingas al carbón y orden de papas.',
      badge: 'PROMO DEL DÍA',
      image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/21854044-05b7-431f-99a3-07c81abe8cde.webp',
      categoryId: 8
    },
    {
      id: 67,
      name: '2 Norteñas + Papas Cheddar',
      price: '$220',
      tagline: '2 hamburguesas norteñas a la brasa acompañadas con papas bañadas en cheddar.',
      badge: 'COMBO ESPECIAL',
      image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/b9403761-15e2-4f9d-8863-4fc4a3757fff.webp',
      categoryId: 8
    },
    {
      id: 69,
      name: '2 Norteñas + Nuggets + Papas + Aros',
      price: '$320',
      tagline: 'El festín completo al fuego para compartir en familia o con amigos.',
      badge: 'FESTÍN AL CARBÓN',
      image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/b9403761-15e2-4f9d-8863-4fc4a3757fff.webp',
      categoryId: 8
    },
    {
      id: 68,
      name: '3 H. Piña Asada + 2 Papas Cheddar',
      price: '$320',
      tagline: 'Tres hamburguesas al carbón con piña caramelizada y doble guarnición.',
      badge: 'FAVORITO GRUPAL',
      image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/ec479dc7-1483-4ff3-b4c8-73271c24bd5a.webp',
      categoryId: 8
    },
    {
      id: 66,
      name: '3 Vikingas + Papas',
      price: '$320',
      tagline: 'Trío vikingo al grill con salchichón asadero, chimichurri y porción de papas.',
      badge: 'ESPECIAL DE AUTOR',
      image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/21854044-05b7-431f-99a3-07c81abe8cde.webp',
      categoryId: 8
    },
    {
      id: 62,
      name: 'Choripán Argentino',
      price: '$70',
      tagline: 'Chorizo parrillero a las brasas de encino con chimichurri casero en pan artesanal.',
      badge: 'CLÁSICO AL FUEGO',
      image: 'https://dbltmjhhukhjrhyvurlo.supabase.co/storage/v1/object/public/imagenes/productos/4fccfea5-5e95-437d-ac5b-7a2255801d38.webp',
      categoryId: 6
    }
  ];

  dailyPromos = computed<DailySpecialItem[]>(() => {
    const allProducts = this.productsService.products();

    // Filtramos los productos de categoría 8 (Combos y Promociones) o destacados de Supabase
    let candidatePool = this.fallbackPromos;

    if (allProducts && allProducts.length > 0) {
      const dbPromos = allProducts.filter(p => Number(p.categoria_id) === 8 && p.visible !== false);
      if (dbPromos.length > 0) {
        candidatePool = dbPromos.map((p, idx) => {
          const fb = this.fallbackPromos.find(f => Number(f.id) === Number(p.id));
          const rawP = p as any;
          const img = p.imagen_url || p.images?.[0]?.url || rawP.foto_principal || fb?.image || 'assets/Galeria/iamgen publicidad 4.jpg';
          return {
            id: p.id,
            name: p.nombre,
            price: `$${p.precio}`,
            tagline: p.descripcion || fb?.tagline || 'Especial a la parrilla preparado con leña y carbón.',
            badge: idx === 0 ? 'PROMO DEL DÍA' : idx === 1 ? 'COMBO ESPECIAL' : 'SUGERENCIA',
            image: img,
            categoryId: p.categoria_id ?? null
          };
        });
      }
    }

    // Rotación determinista diaria por día del año (para que cambie cada día de manera natural y consistente)
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const offset = dayOfYear % candidatePool.length;

    // Seleccionamos 4 elementos rotados
    const selected: DailySpecialItem[] = [];
    for (let i = 0; i < 4; i++) {
      const itemIndex = (offset + i) % candidatePool.length;
      selected.push(candidatePool[itemIndex]);
    }

    return selected;
  });
}

