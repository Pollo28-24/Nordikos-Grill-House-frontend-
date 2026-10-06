import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Interruptor del fondo "Brasa nocturna" del menú público.
 * `false` => el menú vuelve al fondo beige anterior (public-menu.html lo lee).
 */
export const MENU_BACKGROUND_ENABLED = true;

/** Cantidad total de brasas. En móvil el CSS oculta las últimas 4 (quedan 8). */
const EMBER_COUNT = 12;

/**
 * Fondo decorativo del menú: carbón + resplandor de fuego + brasas, solo CSS.
 * - Sin JS en tiempo de ejecución (posiciones de brasas vía nth-child + variables).
 * - Seguro para SSR (no usa APIs del navegador).
 * - Solo anima `transform` y `opacity`.
 */
@Component({
  selector: 'app-menu-background',
  standalone: true,
  templateUrl: './menu-background.html',
  styleUrl: './menu-background.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class MenuBackground {
  protected readonly embers = Array.from({ length: EMBER_COUNT }, (_, i) => i);
}
