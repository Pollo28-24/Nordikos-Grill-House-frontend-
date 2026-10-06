import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-service-tabs',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './service-tabs.html',
  styles: `
    :host { display: block; width: 100%; min-width: 0; }
    @media (min-width: 640px) {
      :host { width: auto; }
    }
  `
})
export class ServiceTabs {
  readonly serviceTypes = input.required<{id: number, nombre: string}[]>();
  readonly selectedTypeId = input.required<number | null>();
  
  readonly selectType = output<number | null>();

  getServiceIcon(name: string): string {
    const n = (name || '').toLowerCase();
    if (n.includes('mesa')) return 'utensils';
    if (n.includes('llevar')) return 'shopping-bag';
    if (n.includes('delivery') || n.includes('domicilio')) return 'bike';
    return 'receipt';
  }
}
