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
        <h3 class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Productos en la Orden</h3>
        @if (order()?.nota_general) {
          <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[#FFB300]">
            <lucide-icon name="info" class="w-3.5 h-3.5" />
            <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Nota General</span>
          </div>
        }
      </div>
      
      <!-- Nota General de la Orden -->
      @if (order()?.nota_general) {
        <div class="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 animate-in fade-in slide-in-from-top-2 duration-200">
          <p class="text-xs sm:text-sm text-amber-200/90 italic leading-relaxed">
            "{{ order()?.nota_general }}"
          </p>
        </div>
      }
      
      <!-- Contenedor Unificado de Items -->
      <div class="rounded-2xl bg-[#1A1A1A] border border-white/10 overflow-hidden shadow-sm">
        <div class="divide-y divide-white/5">
          @for (item of items(); track item.id) {
            <div 
              class="p-4 sm:p-5 flex items-center justify-between gap-3 group hover:bg-white/[0.01] transition duration-150"
              [class.opacity-40]="item.estado === 'cancelado'"
            >
              
              <!-- Información de Item -->
              <div class="flex-grow min-w-0 pr-2">
                <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
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
                  @if (item.estado === 'cancelado') {
                    <span class="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 shrink-0">
                      Cancelado
                    </span>
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

              <!-- Precio & Acciones -->
              <div class="flex items-center gap-3 sm:gap-4 shrink-0">
                <div class="text-right">
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

                @if (canCancelItem(item)) {
                  <div class="flex items-center gap-2">
                    <button 
                      (click)="incrementItem.emit(item)"
                      class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 active:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition duration-150 active:scale-95 cursor-pointer"
                      title="Agregar otro más"
                    >
                      <lucide-icon name="plus" class="w-4 h-4" />
                    </button>
                    
                    <button 
                      (click)="cancelItem.emit(item)"
                      class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 border border-red-500/20 flex items-center justify-center transition duration-150 active:scale-95 cursor-pointer"
                      title="Quitar producto de la orden"
                    >
                      <lucide-icon name="trash-2" class="w-4 h-4" />
                    </button>
                  </div>
                }
              </div>

            </div>
          }

          <!-- Botón de Agregar Productos Integrado en la Lista (48px) -->
          @if (order()?.estado_pedido === 'confirmado' && order()?.estado_pago === 'pendiente') {
            <button
              (click)="addProducts.emit()"
              class="w-full h-12 px-4 bg-white/[0.02] hover:bg-[#FFB300]/10 border-t border-dashed border-white/10 hover:border-[#FFB300]/40 transition duration-200 active:scale-[0.99] flex items-center justify-center gap-2 text-[#FFB300] text-xs font-bold uppercase tracking-wider cursor-pointer select-none"
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
  incrementItem = output<any>();
  cancelItem = output<any>();

  canCancelItem(item: any): boolean {
    const orderStatus = this.order()?.estado_pedido;
    const paymentStatus = this.order()?.estado_pago;
    return (
      orderStatus === 'confirmado' &&
      paymentStatus === 'pendiente' &&
      item.estado !== 'cancelado'
    );
  }
}

