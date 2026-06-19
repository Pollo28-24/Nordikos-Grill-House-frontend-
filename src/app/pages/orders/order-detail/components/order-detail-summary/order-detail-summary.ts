import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-order-detail-summary',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="p-5 rounded-2xl bg-zinc-900/20 border border-white/5 shadow-sm mb-6 animate-in fade-in slide-in-from-top-3 duration-300">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        <!-- Sección Cliente (4 columnas en md) -->
        <div class="md:col-span-4 flex flex-col">
          <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Cliente</h3>
          <div class="space-y-2">
            <div class="flex items-center gap-2.5">
              <div class="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                <lucide-icon name="user" class="w-3.5 h-3.5 text-[#FFB300]" />
              </div>
              <span class="text-sm font-extrabold text-white">{{ order()?.clientes?.nombre || 'Consumidor Final' }}</span>
            </div>
            
            @if (order()?.clientes?.telefono) {
              <div class="flex items-center gap-2.5">
                <div class="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-center shrink-0">
                  <lucide-icon name="phone" class="w-3.5 h-3.5 text-zinc-400" />
                </div>
                <span class="text-zinc-400 text-xs font-semibold">{{ order()?.clientes.telefono }}</span>
              </div>
            }
          </div>
        </div>

        <!-- Divisor vertical opcional para md+ -->
        <div class="hidden md:block md:col-span-1 self-stretch border-r border-white/5 my-1"></div>

        <!-- Detalles del Servicio en 2 Columnas / Métricas (7 columnas en md) -->
        <div class="md:col-span-7">
          <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Detalles del Servicio</h3>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <!-- Métrica 1: Servicio -->
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Servicio</span>
              <span class="text-xs font-extrabold text-white truncate inline-flex items-center">
                <span class="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5 text-[11px] font-bold">
                  {{ order()?.tipos_servicio?.nombre }}
                </span>
              </span>
            </div>

            <!-- Métrica 2: Pago -->
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Pago</span>
              <span class="text-xs font-extrabold text-white truncate inline-flex items-center">
                <span class="px-2 py-0.5 rounded bg-white/[0.04] border border-white/5 text-[11px] font-bold">
                  {{ order()?.metodos_pago?.nombre }}
                </span>
              </span>
            </div>

            <!-- Métrica 3: Fecha -->
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Fecha de Creación</span>
              <span class="text-[11px] font-black text-zinc-300 leading-tight">
                {{ order()?.fecha_creacion | date:'dd/MM/yy' }}
                <span class="block text-[9px] font-medium text-zinc-500 mt-0.5">{{ order()?.fecha_creacion | date:'hh:mm a' }}</span>
              </span>
            </div>

            <!-- Métrica 4: Tiempo -->
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1">
                {{ order()?.fecha_cierre ? 'Duración total' : 'Tiempo en curso' }}
              </span>
              <span class="text-xs font-black tracking-tight" [class.text-[#FFB300]]="!order()?.fecha_cierre" [class.text-white]="order()?.fecha_cierre">
                @if (!order()?.fecha_cierre) {
                  <span class="inline-block w-1.5 h-1.5 rounded-full bg-[#FFB300] animate-pulse mr-1"></span>
                }
                {{ duration }}
              </span>
            </div>
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
