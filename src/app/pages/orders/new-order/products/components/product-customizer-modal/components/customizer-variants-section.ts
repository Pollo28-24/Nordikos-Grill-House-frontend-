import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-customizer-variants-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customizer-variants-section.html'
})
export class CustomizerVariantsSection {
  readonly variants = input<any[]>([]);
  readonly selectedVariants = input<any[]>([]);

  readonly selectVariant = output<any>();
  readonly updateQty = output<{ variantId: any; delta: number }>();

  isVariantSelected(variantId: any): boolean {
    return this.selectedVariants().some(v => v.id === variantId);
  }

  getVariantQty(variantId: any): number {
    const v = this.selectedVariants().find(sv => sv.id === variantId);
    return v ? v.qty : 0;
  }
}
