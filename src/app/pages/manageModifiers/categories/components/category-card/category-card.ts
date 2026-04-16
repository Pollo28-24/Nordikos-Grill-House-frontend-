import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ModifierCategory } from '@core/models/product.model';

@Component({
  selector: 'app-modifier-category-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './category-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModifierCategoryCard {
  category = input.required<ModifierCategory>();

  navigate = output<void>();
  edit = output<void>();
  delete = output<void>();
}
