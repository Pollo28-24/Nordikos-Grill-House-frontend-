import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sales-transactions',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
  `],
  template: `
    <section class="bg-[#181818] border border-white/10 rounded-2xl overflow-hidden shadow-lg shadow-black/25">
      
      <!-- Header de la tabla -->
      <div class="p-5 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-black/10">
        <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Historial de Transacciones</h3>
        
        <div class="flex items-center bg-black/40 p-1 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto">
          <button 
            (click)="serviceTypeChange.emit('all')" 
            class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer" 
            [class.bg-[#303030]]="selectedServiceType() === 'all'" 
            [class.text-white]="selectedServiceType() === 'all'"
            [class.text-zinc-500]="selectedServiceType() !== 'all'"
            [class.hover:text-zinc-300]="selectedServiceType() !== 'all'"
          >Todos</button>
          <button 
            (click)="serviceTypeChange.emit('mesa')" 
            class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer" 
            [class.bg-[#303030]]="selectedServiceType() === 'mesa'" 
            [class.text-white]="selectedServiceType() === 'mesa'"
            [class.text-zinc-500]="selectedServiceType() !== 'mesa'"
            [class.hover:text-zinc-300]="selectedServiceType() !== 'mesa'"
          >Mesa</button>
          <button 
            (click)="serviceTypeChange.emit('llevar')" 
            class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer" 
            [class.bg-[#303030]]="selectedServiceType() === 'llevar'" 
            [class.text-white]="selectedServiceType() === 'llevar'"
            [class.text-zinc-500]="selectedServiceType() !== 'llevar'"
            [class.hover:text-zinc-300]="selectedServiceType() !== 'llevar'"
          >Llevar</button>
          <button 
            (click)="serviceTypeChange.emit('delivery')" 
            class="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer" 
            [class.bg-[#303030]]="selectedServiceType() === 'delivery'" 
            [class.text-white]="selectedServiceType() === 'delivery'"
            [class.text-zinc-500]="selectedServiceType() !== 'delivery'"
            [class.hover:text-zinc-300]="selectedServiceType() !== 'delivery'"
          >Delivery</button>
        </div>
      </div>

      <div class="overflow-x-auto w-full">
        <table class="w-full min-w-[700px] text-left text-xs whitespace-nowrap border-collapse">
          <thead class="bg-black/20 text-zinc-500 border-b border-white/5 font-bold uppercase tracking-wider">
            <tr>
              <th class="w-[15%] px-6 py-3.5 font-bold text-[10px] tracking-widest">Orden</th>
              <th class="w-[20%] px-6 py-3.5 font-bold text-[10px] tracking-widest">Fecha y Hora</th>
              <th class="w-[20%] px-6 py-3.5 font-bold text-[10px] tracking-widest">Servicio</th>
              <th class="w-[30%] px-6 py-3.5 font-bold text-[10px] tracking-widest">Cliente / Nota</th>
              <th class="w-[15%] px-6 py-3.5 font-bold text-[10px] tracking-widest text-right">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 bg-transparent">
            @for (order of orders(); track order.id) {
              <tr class="hover:bg-white/[0.01] transition-colors" [class.opacity-45]="order.estado_pedido === 'cancelado'">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <span class="inline-flex items-center justify-center px-2 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-300 font-mono text-[11px] font-bold">
                      #{{ order.numero_orden || order.id }}
                    </span>
                    @if (order.estado_pedido === 'cancelado') {
                      <span class="px-2 py-0.5 rounded text-[8px] font-black bg-red-500/10 text-red-400 border border-red-500/20 uppercase tracking-wider">
                        Cancelada
                      </span>
                    }
                  </div>
                </td>
                <td class="px-6 py-4 text-zinc-400 font-medium">
                  {{ order.fecha_creacion | date:'dd/MMM, hh:mm a' }}
                </td>
                <td class="px-6 py-4">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all duration-300"
                    [class.bg-orange-500/10]="order.tipo_servicio_nombre.toLowerCase().includes('mesa')"
                    [class.text-orange-400]="order.tipo_servicio_nombre.toLowerCase().includes('mesa')"
                    [class.border-orange-500/20]="order.tipo_servicio_nombre.toLowerCase().includes('mesa')"
                    [class.bg-purple-500/10]="order.tipo_servicio_nombre.toLowerCase().includes('llevar')"
                    [class.text-purple-400]="order.tipo_servicio_nombre.toLowerCase().includes('llevar')"
                    [class.border-purple-500/20]="order.tipo_servicio_nombre.toLowerCase().includes('llevar')"
                    [class.bg-cyan-500/10]="order.tipo_servicio_nombre.toLowerCase().includes('delivery')"
                    [class.text-cyan-400]="order.tipo_servicio_nombre.toLowerCase().includes('delivery')"
                    [class.border-cyan-500/20]="order.tipo_servicio_nombre.toLowerCase().includes('delivery')"
                  >
                    @if (order.tipo_servicio_nombre.toLowerCase().includes('mesa')) {
                      <lucide-icon name="utensils" class="w-3 h-3"></lucide-icon>
                    } @else if (order.tipo_servicio_nombre.toLowerCase().includes('llevar')) {
                      <lucide-icon name="shopping-bag" class="w-3 h-3"></lucide-icon>
                    } @else if (order.tipo_servicio_nombre.toLowerCase().includes('delivery')) {
                      <lucide-icon name="bike" class="w-3 h-3"></lucide-icon>
                    }
                    {{ order.tipo_servicio_nombre }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex flex-col max-w-[200px]">
                    <span class="text-xs text-white font-bold truncate">{{ order.cliente_nombre || 'Consumidor Final' }}</span>
                    @if (order.nota_general) {
                      <span class="text-[10px] text-zinc-500 truncate mt-0.5">{{ order.nota_general }}</span>
                    }
                  </div>
                </td>
                <td class="px-6 py-4 text-right font-black text-white text-xs font-mono">
                  <span [class.line-through]="order.estado_pedido === 'cancelado'" [class.text-zinc-600]="order.estado_pedido === 'cancelado'">
                    &#36;{{ order.total | number:'1.2-2' }}
                  </span>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-6 py-16 text-center text-zinc-500 bg-transparent">
                  <lucide-icon name="inbox" class="w-10 h-10 mx-auto mb-3 text-zinc-600 opacity-80"></lucide-icon>
                  <p class="text-xs font-bold text-zinc-400 uppercase tracking-wider">No se encontraron transacciones</p>
                  <p class="text-[10px] text-zinc-600 font-medium mt-1">Asegúrate de que existan órdenes registradas en este periodo.</p>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `
})
export class SalesTransactions {
  orders = input.required<any[]>();
  selectedServiceType = input.required<'all' | 'mesa' | 'llevar' | 'delivery'>();
  serviceTypeChange = output<'all' | 'mesa' | 'llevar' | 'delivery'>();
}
