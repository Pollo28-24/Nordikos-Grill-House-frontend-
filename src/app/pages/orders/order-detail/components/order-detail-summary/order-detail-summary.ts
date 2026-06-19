import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-order-detail-summary',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-in fade-in slide-in-from-top-2 duration-300">
      <!-- Tarjeta de Cliente -->
      <div class="p-6 rounded-xl bg-gradient-to-b from-[#1C1C1E] to-[#161618] border border-white/[0.04] shadow-md flex flex-col justify-between">
        <div>
          <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Información del Cliente</h3>
          <div class="space-y-3.5">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                <lucide-icon name="user" class="w-4 h-4 text-[#FFB300]" />
              </div>
              <span class="text-sm font-extrabold text-white">{{ order()?.clientes?.nombre || 'Consumidor Final' }}</span>
            </div>
            @if (order()?.clientes?.telefono) {
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center shrink-0">
                  <lucide-icon name="phone" class="w-4 h-4 text-[#FFB300]" />
                </div>
                <span class="text-zinc-400 text-xs font-semibold">{{ order()?.clientes.telefono }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Tarjeta de Detalles del Servicio -->
      <div class="p-6 rounded-xl bg-gradient-to-b from-[#1C1C1E] to-[#161618] border border-white/[0.04] shadow-md">
        <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Detalles del Servicio</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-zinc-500 uppercase tracking-wider text-[10px]">Servicio</span>
            <span class="text-white bg-white/5 border border-white/5 px-2 py-0.5 rounded">{{ order()?.tipos_servicio?.nombre }}</span>
          </div>
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-zinc-500 uppercase tracking-wider text-[10px]">Pago</span>
            <span class="text-white bg-white/5 border border-white/5 px-2 py-0.5 rounded">{{ order()?.metodos_pago?.nombre }}</span>
          </div>
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-zinc-500 uppercase tracking-wider text-[10px]">Fecha</span>
            <span class="text-white font-bold">{{ order()?.fecha_creacion | date:'dd/MM/yy, hh:mm a' }}</span>
          </div>
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-zinc-500 uppercase tracking-wider text-[10px]">
              {{ order()?.fecha_cierre ? 'Duración total' : 'Tiempo en curso' }}
            </span>
            <span class="font-extrabold" [class.text-[#FFB300]]="!order()?.fecha_cierre" [class.text-white]="order()?.fecha_cierre">
              {{ duration }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class OrderDetailSummary {
  order = input.required<any>();
  currentTime = input.required<number>();

  get duration(): string {
    const o = this.order();
    if (!o?.fecha_creacion) return '...';
    
    const start = new Date(o.fecha_creacion).getTime();
    const end = o.fecha_cierre ? new Date(o.fecha_cierre).getTime() : this.currentTime();
    
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      return `${diffMins}m ${diffSecs}s`;
    } else {
      const diffHours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return `${diffHours}h ${remainingMins}m`;
    }
  }
}
