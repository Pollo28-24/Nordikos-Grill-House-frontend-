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
            <div 
              class="py-3 px-4 flex items-center justify-between group hover:bg-white/[0.01] transition duration-150"
              [class.opacity-40]="item.estado === 'cancelado'"
            >
              
              <!-- Información de Item -->
              <div class="flex-grow min-w-0 pr-4">
                <div class="flex items-center gap-3">
                  <span class="w-6 h-6 rounded-md bg-zinc-800 text-zinc-300 border border-white/5 flex items-center justify-center text-[10px] font-black shrink-0">
                    {{ item.cantidad }}
                  </span>
                  <span 
                    class="font-extrabold text-sm truncate"
                    [class.text-white]="item.estado !== 'cancelado'"
                    [class.text-zinc-500]="item.estado === 'cancelado'"
                    [class.line-through]="item.estado === 'cancelado'"
                  >
                    {{ item.nombre_producto }}
                  </span>
                  @if (item.estado === 'cancelado') {
                    <span class="text-[8px] font-bold uppercase tracking-wider text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 shrink-0">
                      Cancelado
                    </span>
                  }
                </div>
                
                @if (item.nota) {
                  <p class="text-[11px] text-[#FFB300]/80 italic ml-9 mt-1 truncate" [class.line-through]="item.estado === 'cancelado'">
                    "{{ item.nota }}"
                  </p>
                }

                @if (item.modificadores?.length > 0) {
                  <div class="ml-9 mt-1.5 flex flex-wrap gap-1.5">
                    @for (m of item.modificadores; track m.id) {
                      <span 
                        class="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                        [class.text-emerald-400]="item.estado !== 'cancelado'"
                        [class.bg-emerald-500/10]="item.estado !== 'cancelado'"
                        [class.border-emerald-500/20]="item.estado !== 'cancelado'"
                        [class.text-zinc-600]="item.estado === 'cancelado'"
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
              <div class="flex items-center gap-3.5 shrink-0">
                <div class="text-right">
                  <span 
                    class="text-sm font-extrabold tabular-nums"
                    [class.text-white]="item.estado !== 'cancelado'"
                    [class.text-zinc-500]="item.estado === 'cancelado'"
                    [class.line-through]="item.estado === 'cancelado'"
                  >
                    \${{ (item.precio_unitario * item.cantidad) | number:'1.2-2' }}
                  </span>
                  <p class="text-[10px] text-zinc-500 mt-0.5 font-medium tabular-nums">\${{ item.precio_unitario }} c/u</p>
                </div>

                @if (canCancelItem(item)) {
                  <div class="flex items-center gap-1.5">
                    <button 
                      (click)="incrementItem.emit(item)"
                      class="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 transition duration-150 active:scale-95 cursor-pointer"
                      title="Agregar otro más"
                    >
                      <lucide-icon name="plus" class="w-4 h-4" />
                    </button>
                    
                    <button 
                      (click)="cancelItem.emit(item)"
                      class="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition duration-150 active:scale-95 cursor-pointer"
                      title="Quitar producto de la orden"
                    >
                      <lucide-icon name="trash-2" class="w-4 h-4" />
                    </button>
                  </div>
                }
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

