import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomizationStore } from '../../store/customization.store';

@Component({
  selector: 'app-section-tabs-nav',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (store.sections().length > 1) {
      <nav 
        class="px-3 sm:px-4 py-2 bg-[#F1ECDF] border-b border-[#E2D7B7]/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0"
        role="tablist"
        aria-label="Pestañas de personalización"
      >
        @for (sec of store.sections(); track sec.id; let idx = $index) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="store.activeSectionIndex() === idx"
            (click)="onSelectSection.emit(idx)"
            class="h-8 sm:h-8.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer select-none touch-manipulation"
            [class.bg-orange-500]="store.activeSectionIndex() === idx"
            [class.text-white]="store.activeSectionIndex() === idx"
            [class.font-black]="store.activeSectionIndex() === idx"
            [class.shadow-xs]="store.activeSectionIndex() === idx"
            [class.bg-white/80]="store.activeSectionIndex() !== idx"
            [class.text-gray-600]="store.activeSectionIndex() !== idx"
            [class.hover:bg-white]="store.activeSectionIndex() !== idx"
            [class.hover:text-gray-900]="store.activeSectionIndex() !== idx"
            [class.border]="store.activeSectionIndex() !== idx"
            [class.border-[#E2D7B7]/60]="store.activeSectionIndex() !== idx"
          >
            @if (sec.isComplete) {
              <span 
                class="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-black"
                [class]="store.activeSectionIndex() === idx ? 'bg-white text-orange-600' : 'bg-green-100 text-green-700'"
              >
                ✓
              </span>
            } @else if (sec.isRequired) {
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            }

            <span>{{ sec.title }}</span>

            @if (sec.selectionCount > 0 && sec.type === 'modifier-category') {
              <span class="text-[10px] opacity-90 tabular-nums">({{ sec.selectionCount }})</span>
            }

            @if (sec.isRequired && !sec.isComplete) {
              <span class="text-[11px] font-black text-amber-500 leading-none">*</span>
            }
          </button>
        }
      </nav>
    }
  `,
  styles: [`
    .scrollbar-none::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-none {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class SectionTabsNavComponent {
  readonly store = inject(CustomizationStore);
  readonly onSelectSection = output<number>();
}
