import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-order-detail-header',
  standalone: true,
  imports: [CommonModule, NgClass, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-6">
      <div class="flex items-center gap-4">
        <button (click)="goBack.emit()" class="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition">
          <lucide-icon name="chevron-left" class="w-6 h-6" />
        </button>
        <h1 class="text-xl sm:text-2xl font-bold tracking-tight">Orden #{{ order()?.numero_orden || orderId() }}</h1>
      </div>
      
      <div class="flex flex-wrap items-center gap-3">
        @if (order()) {
          <div class="flex gap-2 w-full sm:w-auto">
            <button 
              (click)="openTicket.emit('kitchen')"
              class="flex-1 sm:flex-none p-2 rounded-xl bg-orange-600/10 text-orange-500 hover:bg-orange-600/20 transition flex items-center justify-center gap-2 px-4"
            >
              <lucide-icon name="chef-hat" class="w-5 h-5" />
              <span class="text-[10px] sm:text-xs font-bold uppercase">Cocina</span>
            </button>
            <button 
              (click)="openTicket.emit('account')"
              class="flex-1 sm:flex-none p-2 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition flex items-center justify-center gap-2 px-4"
              title="Ver ticket de cuenta"
            >
              <lucide-icon name="printer" class="w-5 h-5" />
              <span class="text-[10px] sm:text-xs font-bold uppercase">Cuenta</span>
            </button>
            <button 
              (click)="shareTicketPDF.emit()"
              class="flex-1 sm:flex-none p-2 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition flex items-center justify-center gap-2 px-4"
              title="Compartir comprobante PDF"
            >
              <lucide-icon name="file-text" class="w-5 h-5" />
              <span class="text-[10px] sm:text-xs font-bold uppercase">PDF</span>
            </button>
          </div>
        }
        
        @if (order()) {
          <div class="flex items-center sm:items-end gap-2 sm:flex-col ml-auto sm:ml-0">
            <span
              class="px-3 sm:px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest"
              [ngClass]="{
                'bg-zinc-500/20 text-zinc-400': order()?.estado_pedido === 'pendiente',
                'bg-blue-500/20 text-blue-400': order()?.estado_pedido === 'confirmado',
                'bg-emerald-500/20 text-emerald-400': order()?.estado_pedido === 'entregado',
                'bg-red-500/20 text-red-400': order()?.estado_pedido === 'cancelado'
              }"
            >
              {{ order()?.estado_pedido }}
            </span>

            <span
              class="px-2 sm:px-3 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border"
              [ngClass]="{
                'bg-zinc-500/5 text-zinc-500 border-zinc-500/20': order()?.estado_pago === 'pendiente',
                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': order()?.estado_pago === 'pagado',
                'bg-red-500/10 text-red-500 border-red-500/20': order()?.estado_pago === 'fallido',
                'bg-purple-500/10 text-purple-500 border-purple-500/20': order()?.estado_pago === 'reembolsado'
              }"
            >
              Pago: {{ order()?.estado_pago }}
            </span>
          </div>
        }
      </div>
    </div>
  `
})
export class OrderDetailHeader {
  order = input<any>();
  orderId = input.required<string | null>();

  goBack = output<void>();
  openTicket = output<'kitchen' | 'account'>();
  shareTicketPDF = output<void>();
}
