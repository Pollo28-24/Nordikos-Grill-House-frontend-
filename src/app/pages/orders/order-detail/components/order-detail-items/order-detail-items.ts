import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-order-detail-items',
  standalone: true,
  imports: [CommonModule, DecimalPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      
      <!-- Cabecera de la sección de productos -->
      <div class="flex items-center justify-between px-1">
        <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Productos en la Orden</h3>
        @if (order()?.nota_general) {
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[#FFB300]">
            <lucide-icon name="info" class="w-3.5 h-3.5" />
            <span class="text-[9px] font-bold uppercase tracking-wider">Nota General</span>
          </div>
        }
      </div>
      
      <!-- Nota General de la Orden -->
      @if (order()?.nota_general) {
        <div class="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 animate-in fade-in slide-in-from-top-2 duration-200">
          <p class="text-xs text-amber-200/85 italic leading-relaxed">
            "{{ order()?.nota_general }}"
          </p>
        </div>
      }
      
      <!-- Contenedor Unificado de Items -->
      <div class="rounded-2xl bg-zinc-900/10 border border-white/5 overflow-hidden shadow-sm">
        <div class="divide-y divide-white/[0.03]">
          @for (item of items(); track item.id) {
            <div class="py-3 px-4 flex items-center justify-between group hover:bg-white/[0.01] transition duration-150">
              
              <!-- Información de Item -->
              <div class="flex-grow min-w-0 pr-4">
                <div class="flex items-center gap-3">
                  <span class="w-6 h-6 rounded-md bg-zinc-800 text-zinc-300 border border-white/5 flex items-center justify-center text-[10px] font-black shrink-0">
                    {{ item.cantidad }}
                  </span>
                  <span class="font-extrabold text-white text-sm truncate">{{ item.nombre_producto }}</span>
                </div>
                
                @if (item.nota) {
                  <p class="text-[11px] text-[#FFB300]/80 italic ml-9 mt-1 truncate">
                    "{{ item.nota }}"
                  </p>
                }

                @if (item.modificadores?.length > 0) {
                  <div class="ml-9 mt-1.5 flex flex-wrap gap-1.5">
                    @for (m of item.modificadores; track m.id) {
                      <span class="text-[8px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        + {{ m.nombre_modificador }}
                      </span>
                    }
                  </div>
                }
              </div>

              <!-- Precio -->
              <div class="text-right shrink-0">
                <span class="text-sm font-extrabold text-white tabular-nums">\${{ (item.precio_unitario * item.cantidad) | number:'1.2-2' }}</span>
                <p class="text-[10px] text-zinc-500 mt-0.5 font-medium tabular-nums">\${{ item.precio_unitario }} c/u</p>
              </div>

            </div>
          }

          <!-- Botón de Agregar Productos Integrado en la Lista -->
          @if (order()?.estado_pedido === 'confirmado' && order()?.estado_pago === 'pendiente') {
            <button
              (click)="addProducts.emit()"
              class="w-full py-3.5 px-4 bg-white/[0.01] hover:bg-[#FFB300]/5 border-t border-dashed border-white/5 hover:border-[#FFB300]/30 transition duration-200 active:scale-[0.99] flex items-center justify-center gap-2 text-[#FFB300] text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              <lucide-icon name="plus" class="w-4 h-4 text-[#FFB300]" />
              <span>Agregar Productos</span>
            </button>
          }
        </div>
      </div>

    </div>
  `,
})
export class OrderDetailItems {
  order = input.required<any>();
  items = input.required<any[]>();

  addProducts = output<void>();
}

