import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-order-detail-header',
  standalone: true,
  imports: [CommonModule, NgClass, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-5 mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      <!-- Fila 1: Botón Regresar, Título y Estados -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <button 
            (click)="goBack.emit()" 
            class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] border border-white/10 text-zinc-300 hover:text-white transition duration-200 active:scale-95 shrink-0 cursor-pointer" 
            title="Volver"
          >
            <lucide-icon name="chevron-left" class="w-5 h-5" />
          </button>
          <div class="flex flex-col min-w-0">
            <span class="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest leading-none mb-1">Detalle de la Orden</span>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Orden #{{ order()?.numero_orden || orderId() }}
            </h1>
          </div>
        </div>

        <!-- Fila de Estados Unificados con Indicadores de Pulso -->
        @if (order()) {
          <div class="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <!-- Chip Estado Pedido -->
            <div
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border transition-all duration-300"
              [ngClass]="{
                'bg-zinc-500/10 text-zinc-400 border-zinc-500/20': order()?.estado_pedido === 'pendiente',
                'bg-blue-500/10 text-blue-400 border-blue-500/20': order()?.estado_pedido === 'confirmado',
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': order()?.estado_pedido === 'entregado',
                'bg-red-500/10 text-red-400 border-red-500/20': order()?.estado_pedido === 'cancelado'
              }"
            >
              <span class="w-2 h-2 rounded-full"
                [ngClass]="{
                  'bg-zinc-500': order()?.estado_pedido === 'pendiente',
                  'bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]': order()?.estado_pedido === 'confirmado',
                  'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]': order()?.estado_pedido === 'entregado',
                  'bg-red-400': order()?.estado_pedido === 'cancelado'
                }"></span>
              <span>{{ order()?.estado_pedido }}</span>
            </div>

            <!-- Chip Estado Pago -->
            <div
              class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider border transition-all duration-300"
              [ngClass]="{
                'bg-rose-500/10 text-rose-400 border-rose-500/20': order()?.estado_pago === 'pendiente',
                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': order()?.estado_pago === 'pagado',
                'bg-red-500/10 text-red-400 border-red-500/20': order()?.estado_pago === 'fallido',
                'bg-purple-500/10 text-purple-400 border-purple-500/20': order()?.estado_pago === 'reembolsado'
              }"
            >
              <span class="w-2 h-2 rounded-full"
                [ngClass]="{
                  'bg-rose-400 animate-pulse shadow-[0_0_8px_rgba(251,113,133,0.6)]': order()?.estado_pago === 'pendiente',
                  'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]': order()?.estado_pago === 'pagado',
                  'bg-red-400': order()?.estado_pago === 'fallido',
                  'bg-purple-400': order()?.estado_pago === 'reembolsado'
                }"></span>
              <span>Pago: {{ order()?.estado_pago }}</span>
            </div>
          </div>
        }
      </div>
      
      <!-- Fila 2: Botones de Acción (POS Toolbar style - 44px touch targets) -->
      @if (order()) {
        <div class="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2.5 mt-1">
          @if (order()?.estado_pedido !== 'cancelado') {
            <button 
              (click)="cancelOrder.emit()"
              class="h-11 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 border border-red-500/20 transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider w-full sm:w-auto cursor-pointer select-none"
              title="Cancelar orden"
            >
              <lucide-icon name="ban" class="w-4 h-4 text-red-400" />
              <span>Cancelar</span>
            </button>
          }

          <button 
            (click)="openTicket.emit('kitchen')"
            class="h-11 px-4 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 active:bg-orange-500/30 text-orange-400 border border-orange-500/20 transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider w-full sm:w-auto cursor-pointer select-none"
            title="Ticket Cocina"
          >
            <lucide-icon name="chef-hat" class="w-4 h-4 text-orange-400" />
            <span>Cocina</span>
          </button>
          
          <button 
            (click)="openTicket.emit('account')"
            class="h-11 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-[#FFB300] border border-amber-500/20 transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider w-full sm:w-auto cursor-pointer select-none"
            title="Ticket Cuenta"
          >
            <lucide-icon name="printer" class="w-4 h-4 text-[#FFB300]" />
            <span>Cuenta</span>
          </button>
          
          <button 
            (click)="shareTicketPDF.emit()"
            class="h-11 px-4 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-400 border border-blue-500/20 transition duration-200 active:scale-95 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider w-full sm:w-auto cursor-pointer select-none"
            title="Compartir comprobante PDF"
          >
            <lucide-icon name="file-text" class="w-4 h-4 text-blue-400" />
            <span>PDF</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class OrderDetailHeader {
  order = input<any>();
  orderId = input.required<string | null>();

  goBack = output<void>();
  openTicket = output<'kitchen' | 'account'>();
  shareTicketPDF = output<void>();
  cancelOrder = output<void>();
}
