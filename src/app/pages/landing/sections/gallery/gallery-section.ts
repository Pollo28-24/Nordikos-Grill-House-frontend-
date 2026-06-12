import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';
import { RevealOnScrollDirective } from '@shared/directives/reveal-on-scroll.directive';

interface GalleryItem {
  url: string;
  title: string;
  category: string;
}

@Component({
  selector: 'app-gallery-section',
  standalone: true,
  imports: [RevealOnScrollDirective],
  templateUrl: './gallery-section.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GallerySection {
  @Output() selectImage = new EventEmitter<number>();

  images: GalleryItem[] = [
    {
      url: 'assets/Galeria/iamgen publicidad.jpg',
      title: 'Hamburguesa Nórdicos',
      category: 'Hamburguesas'
    },
    {
      url: 'assets/Galeria/imagen publicidad 2.jpg',
      title: 'Cortes Especiales',
      category: 'Al Grill'
    },
    {
      url: 'assets/Galeria/iamgen publicidad 3.jpg',
      title: 'Sabor Artesanal',
      category: 'Especialidades'
    },
    {
      url: 'assets/Galeria/iamgen publicidad 4.jpg',
      title: 'Platillo Signature',
      category: 'Destacados'
    },
    {
      url: 'assets/Galeria/iamgen publicidad 5.jpg',
      title: 'Del Fuego a tu Mesa',
      category: 'Preparación'
    },
    {
      url: 'assets/Galeria/imagen publicidad 6.jpg',
      title: 'Acompañamientos Premium',
      category: 'Acompañamientos'
    },
    {
      url: 'assets/Galeria/iamgen publicidad 7.jpg',
      title: 'El Arte del Carbón',
      category: 'Cocina'
    },
    {
      url: 'assets/Galeria/imagen publicidad 8.jpg',
      title: 'El Arte del Carbón',
      category: 'Cocina'
    },
    {
      url: 'assets/Galeria/imagen publicidad 9.jpg',
      title: 'El Arte del Carbón',
      category: 'Cocina'
    },
    {
      url: 'assets/Galeria/imagen publicidad 10.jpg',
      title: 'El Arte del Carbón',
      category: 'Cocina'
    },
    {
      url: 'assets/Galeria/bebida.jpg',
      title: 'Bebidas de la Casa',
      category: 'Bebidas'
    },
    {
      url: 'assets/Galeria/imagen publicidad 11.jpg',
      title: 'Bebidas de la Casa',
      category: 'Bebidas'
    },
    {
      url: 'assets/Galeria/lcoal.jpg',
      title: 'Nuestro Local',
      category: 'Ambiente'
    },
    {
      url: 'assets/Galeria/local2.jpg',
      title: 'Espacio Nórdicos',
      category: 'Ambiente'
    }
  ];

  onImageClick(index: number) {
    this.selectImage.emit(index);
  }
}
