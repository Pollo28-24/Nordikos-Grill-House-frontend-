import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { Modifier } from '@core/models/product.model';

@Component({
  selector: 'app-modifier-item-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './modifier-item-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModifierItemCard {
  modifier = input.required<Modifier>();

  assign = output<void>();
  edit = output<void>();
  delete = output<void>();
}
