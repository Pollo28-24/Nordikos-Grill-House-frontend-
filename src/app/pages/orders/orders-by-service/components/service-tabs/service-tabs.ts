import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-service-tabs',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex p-1 gap-1 rounded-lg bg-white/[0.02] border border-white/5 overflow-x-auto scrollbar-hide flex-nowrap max-w-full">
      <button class="shrink-0 px-4 h-8 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95" 
        [class.bg-white/10]="selectedTypeId() === null" 
        [class.text-[#FFB300]]="selectedTypeId() === null"
        [class.text-zinc-400]="selectedTypeId() !== null"
        [class.hover:text-zinc-200]="selectedTypeId() !== null"
        (click)="selectType.emit(null)">
        Todas
      </button>

      @for (t of serviceTypes(); track t.id) {
        <button class="shrink-0 px-4 h-8 rounded-md text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95" 
          [class.bg-white/10]="selectedTypeId() === t.id" 
          [class.text-[#FFB300]]="selectedTypeId() === t.id"
          [class.text-zinc-400]="selectedTypeId() !== t.id"
          [class.hover:text-zinc-200]="selectedTypeId() !== t.id"
          (click)="selectType.emit(t.id)">
          {{ t.nombre }}
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; max-width: 100%; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
  `
})
export class ServiceTabs {
  serviceTypes = input.required<{id: number, nombre: string}[]>();
  selectedTypeId = input.required<number | null>();
  
  selectType = output<number | null>();
}

