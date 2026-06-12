import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyMxn',
  standalone: true,
})
export class CurrencyMxnPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    currencyDisplay: 'narrowSymbol',
  });

  transform(value: number | null | undefined): string {
    if (value == null) return '';
    return this.formatter.format(value);
  }
}
