import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-customizer-footer',
  standalone: true,
  imports: [CommonModule, DecimalPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customizer-footer.html'
})
export class CustomizerFooter {
  readonly canAddToOrder = input<boolean>(false);
  readonly blockingReason = input<string | null>(null);
  readonly baseTotal = input<number>(0);
  readonly extrasTotal = input<number>(0);
  readonly liveTotal = input<number>(0);
  readonly editingOrderId = input<number | string | null>(null);

  readonly confirm = output<void>();
}
