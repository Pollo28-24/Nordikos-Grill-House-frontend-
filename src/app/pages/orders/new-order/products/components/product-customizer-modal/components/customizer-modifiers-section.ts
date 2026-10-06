import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-customizer-modifiers-section',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customizer-modifiers-section.html'
})
export class CustomizerModifiersSection {
  readonly group = input.required<any>();
  readonly selectedModifiers = input<any[]>([]);

  readonly toggleModifier = output<any>();
  readonly updateQty = output<{ modId: any; delta: number }>();

  isModifierSelected(modId: any): boolean {
    return this.selectedModifiers().some(m => m.id === modId);
  }

  getModifierQty(modId: any): number {
    const m = this.selectedModifiers().find(sm => sm.id === modId);
    return m ? m.qty : 0;
  }
}
