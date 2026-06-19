import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-order-detail-header',
  standalone: true,
  imports: [CommonModule, NgClass, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6 mb-8">
      <!-- Fila 1: Botón Regresar y Título -->
      <div class="flex items-center gap-3">
        <button (click)="goBack.emit()" class="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 transition active:scale-95 shrink-0" title="Volver">
          <lucide-icon name="chevron-left" class="w-5 h-5 text-zinc-300" />
        </button>
        <div class="flex flex-col min-w-0">
          <h1 class="text-2xl font-extrabold tracking-tight text-white leading-tight">Orden #{{ order()?.numero_orden || orderId() }}</h1>
          
          <!-- Fila de Estados Unificados -->
          @if (order()) {
            <div class="flex items-center gap-1.5 mt-1.5">
              <span
                class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all duration-300"
                [ngClass]="{
                  'bg-zinc-500/10 text-zinc-400 border-zinc-500/20': order()?.estado_pedido === 'pendiente',
                  'bg-blue-500/10 text-blue-400 border-blue-500/20': order()?.estado_pedido === 'confirmado',
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': order()?.estado_pedido === 'entregado',
                  'bg-red-500/10 text-red-400 border-red-500/20': order()?.estado_pedido === 'cancelado'
                }"
              >
                {{ order()?.estado_pedido }}
              </span>

              <span
                class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border transition-all duration-300"
                [ngClass]="{
                  'bg-rose-500/10 text-rose-400 border-rose-500/20': order()?.estado_pago === 'pendiente',
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20': order()?.estado_pago === 'pagado',
                  'bg-red-500/10 text-red-400 border-red-500/20': order()?.estado_pago === 'fallido',
                  'bg-purple-500/10 text-purple-400 border-purple-500/20': order()?.estado_pago === 'reembolsado'
                }"
              >
                Pago: {{ order()?.estado_pago }}
              </span>
            </div>
          }
        </div>
      </div>
      
      <!-- Fila 2: Botones de Acción (POS Toolbar style) -->
      @if (order()) {
        <div class="flex flex-wrap items-center gap-2">
          @if (order()?.estado_pedido !== 'cancelado') {
            <button 
              (click)="cancelOrder.emit()"
              class="flex-1 sm:flex-none h-10 px-4 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition active:scale-95 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
              title="Cancelar orden"
            >
              <lucide-icon name="ban" class="w-4 h-4" />
              <span>Cancelar</span>
            </button>
          }

          <button 
            (click)="openTicket.emit('kitchen')"
            class="flex-1 sm:flex-none h-10 px-4 rounded-lg bg-white/5 text-orange-400 border border-white/5 hover:bg-white/10 hover:border-orange-500/20 transition active:scale-95 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
            title="Ticket Cocina"
          >
            <lucide-icon name="chef-hat" class="w-4 h-4" />
            <span>Cocina</span>
          </button>
          
          <button 
            (click)="openTicket.emit('account')"
            class="flex-1 sm:flex-none h-10 px-4 rounded-lg bg-white/5 text-[#FFB300] border border-white/5 hover:bg-white/10 hover:border-[#FFB300]/20 transition active:scale-95 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
            title="Ticket Cuenta"
          >
            <lucide-icon name="printer" class="w-4 h-4" />
            <span>Cuenta</span>
          </button>
          
          <button 
            (click)="shareTicketPDF.emit()"
            class="flex-1 sm:flex-none h-10 px-4 rounded-lg bg-white/5 text-blue-400 border border-white/5 hover:bg-white/10 hover:border-blue-500/20 transition active:scale-95 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
            title="Compartir comprobante PDF"
          >
            <lucide-icon name="file-text" class="w-4 h-4" />
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
