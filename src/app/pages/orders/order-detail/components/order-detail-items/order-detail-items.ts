import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { OrderPolicy } from '@core/domain/order/order.policy';
import { SyncStatus } from '@core/domain/order/order.types';

@Component({
  selector: 'app-order-detail-items',
  standalone: true,
  imports: [CommonModule, DecimalPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      
      <!-- Cabecera de la sección de productos -->
      <div class="flex items-center justify-between px-1">
        <h3 class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Productos en la Orden</h3>
      </div>
      
      <!-- Contenedor Unificado de Items -->
      <div class="rounded-2xl bg-[#1A1A1A] border border-white/10 overflow-hidden shadow-sm">
        <div class="divide-y divide-white/5">
          @for (item of items(); track item.id) {
            <div 
              class="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-white/[0.01] transition duration-150"
              [class.opacity-40]="item.estado === 'cancelado'"
            >
              
              <!-- Información de Item -->
              <div class="flex-grow min-w-0 pr-2">
                <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
                  <!-- Cantidad Badge -->
                  <span class="w-7 h-7 rounded-lg bg-white/[0.04] text-zinc-200 border border-white/10 flex items-center justify-center text-xs font-black shrink-0">
                    {{ item.cantidad }}
                  </span>
                  
                  <span 
                    class="font-extrabold text-sm sm:text-base truncate"
                    [class.text-white]="item.estado !== 'cancelado'"
                    [class.text-zinc-500]="item.estado === 'cancelado'"
                    [class.line-through]="item.estado === 'cancelado'"
                  >
                    {{ item.nombre_producto }}
                  </span>

                  <!-- Badge de Estado Cancelado -->
                  @if (item.estado === 'cancelado') {
                    <span class="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 shrink-0">
                      Cancelado {{ item.motivo_ajuste ? '(' + item.motivo_ajuste + ')' : '' }}
                    </span>
                  }

                  <!-- Micro-badge de Sincronización Optimista (SyncStatus) -->
                  @if (getItemSyncStatus(item.id); as status) {
                    @if (status === 'SYNCING') {
                      <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20" title="Sincronizando con servidor...">
                        <lucide-icon name="loader-2" class="w-2.5 h-2.5 animate-spin" />
                        <span>Sincronizando</span>
                      </span>
                    } @else if (status === 'RETRYING') {
                      <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20" title="Reintentando por intermitencia de red...">
                        <lucide-icon name="refresh-cw" class="w-2.5 h-2.5 animate-spin" />
                        <span>Reintentando</span>
                      </span>
                    } @else if (status === 'FAILED') {
                      <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20" title="Error de red al sincronizar">
                        <lucide-icon name="alert-circle" class="w-2.5 h-2.5" />
                        <span>Error</span>
                      </span>
                    } @else if (status === 'CONFLICT') {
                      <span class="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20" title="Conflicto de concurrencia">
                        <lucide-icon name="alert-triangle" class="w-2.5 h-2.5" />
                        <span>Conflicto</span>
                      </span>
                    }
                  }
                </div>
                
                @if (item.nota) {
                  <p class="text-xs text-[#FFB300]/90 italic ml-9 sm:ml-10 mt-1 truncate" [class.line-through]="item.estado === 'cancelado'">
                    "{{ item.nota }}"
                  </p>
                }

                @if (item.modificadores?.length > 0) {
                  <div class="ml-9 sm:ml-10 mt-2 flex flex-wrap gap-1.5">
                    @for (m of item.modificadores; track m.id) {
                      <span 
                        class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                        [class.text-emerald-400]="item.estado !== 'cancelado'"
                        [class.bg-emerald-500/10]="item.estado !== 'cancelado'"
                        [class.border-emerald-500/20]="item.estado !== 'cancelado'"
                        [class.text-zinc-500]="item.estado === 'cancelado'"
                        [class.border-zinc-800]="item.estado === 'cancelado'"
                        [class.line-through]="item.estado === 'cancelado'"
                      >
                        + {{ m.nombre_modificador }}
                      </span>
                    }
                  </div>
                }
              </div>

              <!-- Precio & Stepper de Acciones Ergonómicas -->
              <div class="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                <div class="text-left sm:text-right">
                  <span 
                    class="text-sm sm:text-base font-extrabold tabular-nums"
                    [class.text-white]="item.estado !== 'cancelado'"
                    [class.text-zinc-500]="item.estado === 'cancelado'"
                    [class.line-through]="item.estado === 'cancelado'"
                  >
                    \${{ (item.precio_unitario * item.cantidad) | number:'1.2-2' }}
                  </span>
                  <p class="text-[10px] sm:text-xs text-zinc-400 mt-0.5 font-medium tabular-nums">\${{ item.precio_unitario }} c/u</p>
                </div>

                @if (canAdjustItem(item)) {
                  <!-- Stepper Ergonómico POS [ - ] [ qty ] [ + ] y botón de anular fila -->
                  <div class="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10">
                    <!-- Decrement Button -->
                    <button 
                      (click)="decrementItem.emit(item)"
                      class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/5 flex items-center justify-center transition duration-150 active:scale-95 cursor-pointer"
                      [title]="item.cantidad > 1 ? 'Restar una unidad' : 'Quitar de la comanda'"
                    >
                      <lucide-icon [name]="item.cantidad > 1 ? 'minus' : 'trash-2'" class="w-3.5 h-3.5" [class.text-red-400]="item.cantidad === 1" />
                    </button>

                    <!-- Cantidad central visual -->
                    <span class="w-7 text-center font-black text-xs sm:text-sm text-white tabular-nums select-none">
                      {{ item.cantidad }}
                    </span>
                    
                    <!-- Increment Button -->
                    <button 
                      (click)="incrementItem.emit(item)"
                      class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition duration-150 active:scale-95 cursor-pointer"
                      title="Sumar una unidad más"
                    >
                      <lucide-icon name="plus" class="w-3.5 h-3.5" />
                    </button>

                    <!-- Anular Fila Completa Directamente (si cantidad > 1) -->
                    @if (item.cantidad > 1) {
                      <div class="w-px h-5 bg-white/10 mx-0.5"></div>
                      <button 
                        (click)="cancelItem.emit(item)"
                        class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 border border-red-500/20 flex items-center justify-center transition duration-150 active:scale-95 cursor-pointer"
                        title="Anular toda la línea de producto"
                      >
                        <lucide-icon name="trash-2" class="w-3.5 h-3.5" />
                      </button>
                    }
                  </div>
                }
              </div>

            </div>
          }

          <!-- Botón de Agregar Productos Integrado en la Lista (48px) -->
          @if (canAddMoreProducts()) {
            <button
              (click)="addProducts.emit()"
              class="w-full h-12 px-4 bg-white/[0.02] hover:bg-[#FFB300]/10 border-t border-dashed border-white/10 hover:border-[#FFB300]/40 transition duration-200 active:scale-[0.99] flex items-center justify-center gap-2 text-[#FFB300] text-xs font-bold uppercase tracking-wider cursor-pointer select-none"
            >
              <lucide-icon name="plus" class="w-4 h-4 text-[#FFB300]" />
              <span>Agregar Más Productos</span>
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
  syncStatusMap = input<Record<number, SyncStatus>>({});

  addProducts = output<void>();
  incrementItem = output<any>();
  decrementItem = output<any>();
  cancelItem = output<any>();

  canAdjustItem(item: any): boolean {
    const o = this.order();
    if (!o) return false;
    return OrderPolicy.canAdjustItem(o, item);
  }

  canAddMoreProducts(): boolean {
    const o = this.order();
    if (!o) return false;
    return OrderPolicy.canModifyItems(o);
  }

  getItemSyncStatus(itemId: number): SyncStatus | null {
    const map = this.syncStatusMap();
    return map ? map[itemId] || null : null;
  }
}
