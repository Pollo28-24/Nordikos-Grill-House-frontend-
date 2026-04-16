import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-order-detail-summary',
  standalone: true,
  imports: [CommonModule, DatePipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <div class="p-5 rounded-2xl bg-[#1E1E1E] border border-white/5">
        <h3 class="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Información del Cliente</h3>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <lucide-icon name="user" class="w-4 h-4 text-amber-500" />
            <span class="font-medium text-white">{{ order()?.clientes?.nombre || 'Consumidor Final' }}</span>
          </div>
          @if (order()?.clientes?.telefono) {
            <div class="flex items-center gap-3">
              <lucide-icon name="phone" class="w-4 h-4 text-amber-500" />
              <span class="text-zinc-400 text-sm">{{ order()?.clientes.telefono }}</span>
            </div>
          }
        </div>
      </div>

      <div class="p-5 rounded-2xl bg-[#1E1E1E] border border-white/5">
        <h3 class="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Detalles del Servicio</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between text-sm">
            <span class="text-zinc-400">Servicio:</span>
            <span class="text-white font-medium">{{ order()?.tipos_servicio?.nombre }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-zinc-400">Pago:</span>
            <span class="text-white font-medium">{{ order()?.metodos_pago?.nombre }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-zinc-400">Fecha:</span>
            <span class="text-white font-medium">{{ order()?.fecha_creacion | date:'short' }}</span>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-zinc-400">
              {{ order()?.fecha_cierre ? 'Duración total:' : 'Tiempo en curso:' }}
            </span>
            <span class="font-bold" [class.text-amber-500]="!order()?.fecha_cierre" [class.text-white]="order()?.fecha_cierre">
              {{ duration }}
            </span>
          </div>
        </div>
      </div>
    </div>
  `
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
