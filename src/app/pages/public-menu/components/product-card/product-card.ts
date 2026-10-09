import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Product } from '@core/models/product.model';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CurrencyMxnPipe],
  templateUrl: './product-card.html',
})
export class ProductCard {
  product = input.required<Product>();
  cartQuantity = input<number>(0);
  isAdded = input<boolean>(false);
  dark = input<boolean>(false);
  /**
   * Conmutador de variante de botón para el pie:
   * 'outline': Botón actual (borde naranja 1.5px, fondo sutil naranja, texto #c2410c, relleno en hover).
   * 'light': Botón más ligero (fondo transparente bg-transparent, borde naranja 1.5px, texto #c2410c, relleno completo hover).
   * 'charcoal': Botón carbón #1c1713 con texto crema y flecha naranja.
   * Cambiar este valor por defecto permite comparar al instante ambas variantes.
   */
  buttonVariant = input<'outline' | 'light' | 'charcoal'>('outline');

  protected cardTheme = computed(() =>
    this.dark()
      ? 'bg-gradient-to-b from-[#f7efe0] to-[#efe2cb] bg-clip-padding border-[#b8864a]/40 shadow-sm transition-all duration-300 ' +
        'hover:-translate-y-1 hover:border-orange-500/70 hover:shadow-[0_12px_28px_rgba(0,0,0,0.35)] ' +
        'motion-reduce:transition-none motion-reduce:hover:translate-y-0 active:scale-[0.99]'
      : 'bg-[#F8F5EE] border-[#E2D7B7]/50 shadow-sm hover:shadow-lg transition-all duration-300 active:scale-[0.99]');

  /**
   * Cálculo de precio exacto considerando variantes:
   * - Extrae precios numéricos válidos (> 0) de variants.
   * - Si min !== max: 'Desde $min' (ej. Alitas $80-$90, Cervezas $30-$50).
   * - Si min === max: '$min' directo sin 'desde' (ej. Sodas $45, Tizana $45).
   * - Si no hay variantes válidas: usa precio base del producto.
   * - Descuentos limitados defensivamente con Math.max(0, precio - desc).
   */
  protected priceInfo = computed(() => {
    const p = this.product();
    const rawVars = p.variants || [];
    const validVarPrices = rawVars
      .map(v => Number(v.precio))
      .filter(n => !isNaN(n) && n > 0);

    let displayPrice = Number(p.precio || 0);
    let isFrom = false;

    if (validVarPrices.length > 0) {
      const minVar = Math.min(...validVarPrices);
      const maxVar = Math.max(...validVarPrices);

      // Si el precio base es 0, menor al mínimo o el tipo es variantes, manda el precio de variantes
      displayPrice = minVar;
      if (minVar !== maxVar) {
        isFrom = true;
      }
    }

    const rawDesc = Number(p.descuento || 0);
    const desc = rawDesc > 0 ? rawDesc : 0;
    const finalPrice = Math.max(0, displayPrice - desc);

    return {
      basePrice: displayPrice,
      discount: desc,
      hasDiscount: desc > 0,
      finalPrice,
      isFrom
    };
  });

  private readonly currencyPipe = new CurrencyMxnPipe();

  protected buttonLabel = computed(() => {
    if (this.isAdded()) return '¡Agregado!';
    if (this.hasCustomizations()) return 'Personalizar';
    return 'Ver Detalle';
  });

  /** Cumple estrictamente la regla de Label in Name para accesibilidad WCAG: "Personalizar Alitas, desde $80.00" */
  protected buttonAriaLabel = computed(() => {
    const action = this.buttonLabel();
    const p = this.product();
    const info = this.priceInfo();
    const prefix = info.isFrom ? 'desde ' : '';
    const formattedPrice = this.currencyPipe.transform(info.finalPrice);
    return `${action} ${p.nombre}, ${prefix}${formattedPrice}`;
  });

  /**
   * Descripción para el layout nuevo: vacía si no hay dato (o es el relleno
   * "Sin descripción"); el dato viene en MAYÚSCULAS desde la base, así que se
   * muestra en minúsculas con la primera letra en mayúscula.
   */
  protected shortDescription = computed(() => {
    const raw = (this.product().descripcion || '').trim();
    if (!raw || /^sin descripci[oó]n\.?$/i.test(raw)) return '';
    const lower = raw.toLocaleLowerCase('es');
    return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1);
  });

  onAdd = output<Product>();
  onViewDetails = output<Product>();

  hasCustomizations(): boolean {
    const p = this.product();
    const hasVariants = p.price_type === 'variants' || (p.variants && p.variants.length > 0);
    const hasModifiers = Boolean(p.modifiers && p.modifiers.length > 0);
    return Boolean(hasVariants || hasModifiers);
  }

  handleCardClick(): void {
    if (this.product().disponible === false) {
      return;
    }
    this.onAdd.emit(this.product());
  }

  openDetails(event: MouseEvent): void {
    event.stopPropagation();
    this.onViewDetails.emit(this.product());
  }

  quickAdd(event: MouseEvent): void {
    event.stopPropagation();
    if (this.product().disponible === false) {
      return;
    }
    this.onAdd.emit(this.product());
  }
}
