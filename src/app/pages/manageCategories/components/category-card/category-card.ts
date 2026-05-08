import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Category } from '@core/models/category.model';
import { LucideAngularModule } from 'lucide-angular';
import { DragDropModule } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-category-card',
  standalone: true,
  imports: [LucideAngularModule, DragDropModule],
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
