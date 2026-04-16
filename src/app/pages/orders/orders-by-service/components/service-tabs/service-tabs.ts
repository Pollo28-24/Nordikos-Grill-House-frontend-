import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-service-tabs',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-6 flex gap-2 flex-wrap">
      <button class="px-4 h-9 rounded-full text-sm bg-[#1E1E1E] border border-black/40 hover:bg-[#1A1A1A] transition" 
        [class.bg-[#FFB300]]="selectedTypeId() === null" 
        [class.text-[#121212]]="selectedTypeId() === null"
        (click)="selectType.emit(null)">
        Todas
      </button>

      @for (t of serviceTypes(); track t.id) {
        <button class="px-4 h-9 rounded-full text-sm bg-[#1E1E1E] border border-black/40 hover:bg-[#1A1A1A] transition" 
          [class.bg-[#FFB300]]="selectedTypeId() === t.id" 
          [class.text-[#121212]]="selectedTypeId() === t.id"
          (click)="selectType.emit(t.id)">
          {{ t.nombre }}
        </button>
      }
    </div>
  `
})
export class ServiceTabs {
  serviceTypes = input.required<{id: number, nombre: string}[]>();
  selectedTypeId = input.required<number | null>();
  
  selectType = output<number | null>();
}
