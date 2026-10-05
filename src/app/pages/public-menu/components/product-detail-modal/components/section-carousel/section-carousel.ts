import { 
  Component, 
  inject, 
  viewChild, 
  ElementRef, 
  AfterViewInit, 
  OnDestroy, 
  PLATFORM_ID,
  effect
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { CurrencyMxnPipe } from '@shared/pipes/currency-mxn.pipe';
import { CustomizationStore } from '../../store/customization.store';

@Component({
  selector: 'app-section-carousel',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, CurrencyMxnPipe],
  template: `
    <div 
      #pagesContainer
      class="flex-1 min-h-0 w-full h-full flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-none overscroll-contain"
      style="scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none;"
    >
      @for (sec of store.sections(); track sec.id; let idx = $index) {
        <div 
          class="section-panel w-full h-full shrink-0 snap-start overflow-y-auto p-3.5 sm:p-4 space-y-3 custom-scrollbar overscroll-contain flex flex-col"
          style="scroll-snap-align: start; scroll-snap-stop: always; min-width: 100%; width: 100%;"
          [attr.data-section-index]="idx"
        >
          <div class="space-y-3 pb-3 flex-1">
            
            <!-- Encabezado de la Sección -->
            <div class="flex items-center justify-between pb-2 border-b border-[#E2D7B7]/60">
              <div class="min-w-0 pr-2">
                <h4 class="text-xs sm:text-sm font-black text-gray-900 tracking-tight flex items-center gap-1.5 truncate">
                  <span>{{ sec.title }}</span>
                  @if (sec.isRequired) {
                    <span class="text-amber-500 font-black text-xs">*</span>
                  }
                </h4>
                <p class="text-[11px] text-gray-500 mt-0.5 leading-snug truncate">
                  @if (sec.type === 'variants') {
                    Elige el tamaño o presentación deseada
                  } @else if (sec.type === 'modifier-category') {
                    {{ sec.data?.category?.descripcion || (sec.isRequired ? 'Selección requerida' : 'Extras opcionales a tu gusto') }}
                  } @else {
                    Personaliza tu pedido con instrucciones para cocina
                  }
                </p>
              </div>

              <div class="shrink-0">
                @if (sec.isRequired) {
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300/60">
                    Requerido
                  </span>
                } @else {
                  <span class="px-2 py-0.5 rounded-full text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200">
                    Opcional
                  </span>
                }
              </div>
            </div>

            <!-- SECCIÓN 1: VARIANTES -->
            @if (sec.type === 'variants') {
              <div class="grid gap-2.5">
                @for (v of store.product()?.variants; track v.id) {
                  <div 
                    (click)="store.selectVariant(v)"
                    class="w-full p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs cursor-pointer touch-manipulation select-none"
                    [class.border-orange-500]="store.selectedVariant()?.id === v.id"
                    [class.bg-orange-50/40]="store.selectedVariant()?.id === v.id"
                    [class.border-[#E2D7B7]]="store.selectedVariant()?.id !== v.id"
                    [class.bg-white]="store.selectedVariant()?.id !== v.id"
                    [class.opacity-40]="v.disponible === false"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div 
                        class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0"
                        [class.border-orange-500]="store.selectedVariant()?.id === v.id"
                        [class.bg-orange-500]="store.selectedVariant()?.id === v.id"
                        [class.border-gray-300]="store.selectedVariant()?.id !== v.id"
                      >
                        @if (store.selectedVariant()?.id === v.id) {
                          <div class="w-2 h-2 rounded-full bg-white"></div>
                        }
                      </div>

                      <div class="flex flex-col min-w-0 pr-1">
                        <span class="font-bold text-xs sm:text-sm text-gray-900 leading-snug truncate">
                          {{ v.nombre }}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-1.5 shrink-0">
                      @if (v.descuento && v.descuento > 0) {
                        <span class="font-black text-xs sm:text-sm text-orange-600 tabular-nums">
                          {{ (v.precio - v.descuento) | currencyMxn }}
                        </span>
                        <del class="text-[10px] text-gray-400 font-medium">
                          {{ v.precio | currencyMxn }}
                        </del>
                      } @else {
                        <span class="font-black text-xs sm:text-sm text-orange-600 tabular-nums">
                          {{ v.precio | currencyMxn }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- SECCIÓN 2: CATEGORÍAS DE MODIFICADORES -->
            @if (sec.type === 'modifier-category' && sec.data) {
              <div class="grid gap-2">
                @for (mod of sec.data.items; track mod.id) {
                  
                  <!-- A. TIPO RADIO (Selección Exclusiva) -->
                  @if (sec.data.category.tipo_seleccion === 'RADIO') {
                    <div 
                      (click)="mod.disponible !== false && store.selectRadioModifier(sec.data.category, mod)"
                      class="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between gap-2.5 shadow-xs touch-manipulation select-none"
                      [class.cursor-pointer]="mod.disponible !== false"
                      [class.cursor-not-allowed]="mod.disponible === false"
                      [class.opacity-50]="mod.disponible === false"
                      [class.border-orange-500]="mod.disponible !== false && store.isModifierSelected(sec.data.category.id, mod.id)"
                      [class.bg-orange-50/40]="mod.disponible !== false && store.isModifierSelected(sec.data.category.id, mod.id)"
                      [class.border-[#E2D7B7]]="mod.disponible === false || !store.isModifierSelected(sec.data.category.id, mod.id)"
                      [class.bg-white]="mod.disponible !== false && !store.isModifierSelected(sec.data.category.id, mod.id)"
                    >
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div 
                          class="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-colors shrink-0"
                          [class.border-orange-500]="store.isModifierSelected(sec.data.category.id, mod.id)"
                          [class.bg-orange-500]="store.isModifierSelected(sec.data.category.id, mod.id)"
                          [class.border-gray-300]="!store.isModifierSelected(sec.data.category.id, mod.id)"
                        >
                          @if (store.isModifierSelected(sec.data.category.id, mod.id)) {
                            <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white"></div>
                          }
                        </div>
                        <span class="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {{ mod.nombre }}
                        </span>
                      </div>

                      <div class="shrink-0 text-right flex items-center gap-1.5">
                        @if (mod.disponible === false) {
                          <span class="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            Agotado
                          </span>
                        } @else if (mod.precio > 0) {
                          <span class="text-xs font-black text-orange-600 tabular-nums">
                            +{{ mod.precio | currencyMxn }}
                          </span>
                        } @else {
                          <span class="text-[11px] font-semibold text-gray-400">
                            Incluido
                          </span>
                        }
                      </div>
                    </div>
                  }

                  <!-- B. TIPO CHECKBOX (Opciones Binarias) -->
                  @if (sec.data.category.tipo_seleccion === 'CHECKBOX') {
                    <div 
                      (click)="mod.disponible !== false && store.toggleCheckboxModifier(sec.data.category, mod)"
                      class="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between gap-2.5 shadow-xs touch-manipulation select-none"
                      [class.cursor-pointer]="mod.disponible !== false"
                      [class.cursor-not-allowed]="mod.disponible === false"
                      [class.opacity-50]="mod.disponible === false"
                      [class.border-orange-500]="mod.disponible !== false && store.isModifierSelected(sec.data.category.id, mod.id)"
                      [class.bg-orange-50/40]="mod.disponible !== false && store.isModifierSelected(sec.data.category.id, mod.id)"
                      [class.border-[#E2D7B7]]="mod.disponible === false || !store.isModifierSelected(sec.data.category.id, mod.id)"
                      [class.bg-white]="mod.disponible !== false && !store.isModifierSelected(sec.data.category.id, mod.id)"
                    >
                      <div class="flex items-center gap-2.5 min-w-0">
                        <div 
                          class="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-lg border-2 flex items-center justify-center transition-colors shrink-0"
                          [class.border-orange-500]="store.isModifierSelected(sec.data.category.id, mod.id)"
                          [class.bg-orange-500]="store.isModifierSelected(sec.data.category.id, mod.id)"
                          [class.border-gray-300]="!store.isModifierSelected(sec.data.category.id, mod.id)"
                        >
                          @if (store.isModifierSelected(sec.data.category.id, mod.id)) {
                            <lucide-icon name="check" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white stroke-[3]"></lucide-icon>
                          }
                        </div>
                        <span class="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {{ mod.nombre }}
                        </span>
                      </div>

                      <div class="shrink-0 text-right flex items-center gap-1.5">
                        @if (mod.disponible === false) {
                          <span class="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                            Agotado
                          </span>
                        } @else if (mod.precio > 0) {
                          <span class="text-xs font-black text-orange-600 tabular-nums">
                            +{{ mod.precio | currencyMxn }}
                          </span>
                        } @else {
                          <span class="text-[11px] font-semibold text-gray-400">
                            Sin costo
                          </span>
                        }
                      </div>
                    </div>
                  }

                  <!-- C. TIPO STEPPER (Cantidad Progresiva) -->
                  @if (sec.data.category.tipo_seleccion === 'STEPPER') {
                    <div 
                      class="w-full p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-between gap-2.5 shadow-xs"
                      [class.opacity-50]="mod.disponible === false"
                      [class.border-orange-500]="mod.disponible !== false && store.getModifierQuantity(sec.data.category.id, mod.id) > 0"
                      [class.bg-orange-50/40]="mod.disponible !== false && store.getModifierQuantity(sec.data.category.id, mod.id) > 0"
                      [class.border-[#E2D7B7]]="mod.disponible === false || store.getModifierQuantity(sec.data.category.id, mod.id) === 0"
                      [class.bg-white]="mod.disponible !== false && store.getModifierQuantity(sec.data.category.id, mod.id) === 0"
                    >
                      <div class="flex flex-col min-w-0 pr-1">
                        <span class="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {{ mod.nombre }}
                        </span>
                        @if (mod.disponible === false) {
                          <span class="text-[10px] font-black uppercase tracking-wider text-amber-700 mt-0.5">
                            Agotado
                          </span>
                        } @else {
                          <span class="text-xs font-black text-orange-600 tabular-nums mt-0.5">
                            +{{ mod.precio | currencyMxn }} c/u
                          </span>
                        }
                      </div>

                      @if (mod.disponible !== false) {
                        <div class="flex items-center bg-[#F8F5EE] rounded-xl p-1 gap-1 border border-[#E2D7B7]/80 shadow-xs shrink-0">
                          <button 
                            type="button"
                            (click)="store.updateStepperModifier(sec.data.category, mod, -1)"
                            [disabled]="store.getModifierQuantity(sec.data.category.id, mod.id) <= 0"
                            class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white text-gray-700 hover:bg-gray-100 active:scale-90 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer touch-manipulation shadow-2xs"
                            aria-label="Restar extra"
                          >
                            <lucide-icon name="minus" class="h-3 w-3 sm:h-3.5 sm:w-3.5"></lucide-icon>
                          </button>
                          
                          <span class="w-6 sm:w-7 text-center font-black text-gray-900 text-xs sm:text-sm tabular-nums">
                            {{ store.getModifierQuantity(sec.data.category.id, mod.id) }}
                          </span>
                          
                          <button 
                            type="button"
                            (click)="store.updateStepperModifier(sec.data.category, mod, 1)"
                            class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white shadow-xs hover:bg-orange-600 active:scale-90 transition cursor-pointer touch-manipulation"
                            aria-label="Añadir extra"
                          >
                            <lucide-icon name="plus" class="h-3 w-3 sm:h-3.5 sm:w-3.5"></lucide-icon>
                          </button>
                        </div>
                      }
                    </div>
                  }

                }
              </div>
            }

            <!-- SECCIÓN 3: NOTAS E INSTRUCCIONES ESPECIALES -->
            @if (sec.type === 'notes') {
              <div class="space-y-3">

                <!-- Chips Rápidos -->
                <div class="space-y-2">
                  <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Opciones Rápidas
                  </span>
                  <div class="flex flex-wrap gap-1.5 pb-1">
                    @for (chip of store.quickChips; track chip) {
                      <button 
                        type="button" 
                        (click)="store.addNoteChip(chip)"
                        class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F4EEDC] text-gray-700 border border-[#E2D7B7] hover:bg-orange-100 hover:text-orange-900 hover:border-orange-300 active:scale-95 transition cursor-pointer touch-manipulation"
                      >
                        + {{ chip }}
                      </button>
                    }
                  </div>
                </div>

                <!-- Textarea con scroll-margin para teclado móvil -->
                <div class="space-y-1.5">
                  <label for="modal-note-input" class="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <lucide-icon name="message-square" class="w-3.5 h-3.5 text-orange-500"></lucide-icon>
                    <span>Instrucciones adicionales para cocina</span>
                  </label>
                  <textarea
                    id="modal-note-input"
                    [ngModel]="store.notes()"
                    (ngModelChange)="store.setNotes($event)"
                    placeholder="Ej: sin cebolla, bien dorada la carne, salsa aparte..."
                    class="w-full text-xs sm:text-sm p-3 bg-white border border-[#E2D7B7] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition resize-none placeholder-gray-400 scroll-mb-24"
                    rows="3"
                  ></textarea>
                </div>

              </div>
            }

          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      width: 100%;
      height: 100%;
    }
    .scrollbar-none::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-none {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `]
})
export class SectionCarouselComponent implements AfterViewInit, OnDestroy {
  readonly store = inject(CustomizationStore);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  readonly pagesContainer = viewChild<ElementRef<HTMLDivElement>>('pagesContainer');
  private observer: IntersectionObserver | null = null;

  constructor() {
    // Sincronizar desplazamiento cuando el store cambia de sección activa externamente (ej. click en tab)
    effect(() => {
      const idx = this.store.activeSectionIndex();
      this.scrollToSection(idx);
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    const container = this.pagesContainer()?.nativeElement;
    if (!container) return;

    // IntersectionObserver con umbral del 60% para sincronizar la pestaña activa con cero sobrecarga de CPU
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idxAttr = entry.target.getAttribute('data-section-index');
            if (idxAttr !== null) {
              const idx = Number(idxAttr);
              if (idx !== this.store.activeSectionIndex()) {
                this.store.setActiveSectionIndex(idx);
              }
            }
          }
        }
      },
      {
        root: container,
        threshold: 0.6
      }
    );

    const panels = container.querySelectorAll('.section-panel');
    panels.forEach(panel => this.observer?.observe(panel));
  }

  scrollToSection(index: number): void {
    const container = this.pagesContainer()?.nativeElement;
    if (!container) return;

    const targetLeft = index * container.clientWidth;
    // Solo scrollear si la posición actual no coincide para evitar bucles
    if (Math.abs(container.scrollLeft - targetLeft) > 5) {
      container.scrollTo({
        left: targetLeft,
        behavior: 'smooth'
      });
    }
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
