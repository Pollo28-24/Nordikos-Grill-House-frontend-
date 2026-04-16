import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Category } from '@core/services/categories.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './category-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryCard {
  category = input.required<Category>();
  isUpdating = input<boolean>(false);

  nameChanged = output<string>();
  descriptionChanged = output<string>();
  toggleVisibility = output<void>();
  delete = output<void>();
  addProduct = output<void>();
}
