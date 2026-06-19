import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

export interface ServiceBreakdownDetail {
  total: number;
  count: number;
  percentage: number;
}

export interface SalesServiceBreakdown {
  mesa: ServiceBreakdownDetail;
  llevar: ServiceBreakdownDetail;
  delivery: ServiceBreakdownDetail;
}

@Component({
  selector: 'app-sales-breakdown',
  standalone: true,
  imports: [DecimalPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
  `],
  template: `
    <section class="bg-[#181818] border border-white/10 rounded-2xl p-6 shadow-lg shadow-black/25">
      <h3 class="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-6 flex items-center gap-2">
        <lucide-icon name="pie-chart" class="w-4 h-4 text-zinc-500"></lucide-icon>
        Desglose de Ingresos por Servicio
      </h3>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <!-- Mesa -->
        <div class="flex flex-col">
          <div class="flex justify-between items-end mb-2.5">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/10">
                <lucide-icon name="utensils" class="w-3.5 h-3.5 text-orange-400"></lucide-icon>
              </div>
              <span class="text-xs font-semibold text-zinc-300">Mesas</span>
            </div>
            <span class="text-base font-extrabold text-white tracking-tight font-mono">&#36;{{ breakdown().mesa.total | number:'1.0-0' }}</span>
          </div>
          <div class="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-1000" [style.width.%]="breakdown().mesa.percentage"></div>
          </div>
          <div class="flex justify-between items-center mt-2.5">
            <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{{ breakdown().mesa.count }} órdenes</span>
            <span class="text-xs font-black text-orange-400">{{ breakdown().mesa.percentage }}%</span>
          </div>
        </div>

        <!-- Llevar -->
        <div class="flex flex-col">
          <div class="flex justify-between items-end mb-2.5">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/10">
                <lucide-icon name="shopping-bag" class="w-3.5 h-3.5 text-purple-400"></lucide-icon>
              </div>
              <span class="text-xs font-semibold text-zinc-300">Para Llevar</span>
            </div>
            <span class="text-base font-extrabold text-white tracking-tight font-mono">&#36;{{ breakdown().llevar.total | number:'1.0-0' }}</span>
          </div>
          <div class="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all duration-1000" [style.width.%]="breakdown().llevar.percentage"></div>
          </div>
          <div class="flex justify-between items-center mt-2.5">
            <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{{ breakdown().llevar.count }} órdenes</span>
            <span class="text-xs font-black text-purple-400">{{ breakdown().llevar.percentage }}%</span>
          </div>
        </div>

        <!-- Delivery -->
        <div class="flex flex-col">
          <div class="flex justify-between items-end mb-2.5">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/10">
                <lucide-icon name="bike" class="w-3.5 h-3.5 text-cyan-400"></lucide-icon>
              </div>
              <span class="text-xs font-semibold text-zinc-300">Delivery</span>
            </div>
            <span class="text-base font-extrabold text-white tracking-tight font-mono">&#36;{{ breakdown().delivery.total | number:'1.0-0' }}</span>
          </div>
          <div class="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-1000" [style.width.%]="breakdown().delivery.percentage"></div>
          </div>
          <div class="flex justify-between items-center mt-2.5">
            <span class="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{{ breakdown().delivery.count }} órdenes</span>
            <span class="text-xs font-black text-cyan-400">{{ breakdown().delivery.percentage }}%</span>
          </div>
        </div>

      </div>
    </section>
  `
})
export class SalesBreakdown {
  breakdown = input.required<SalesServiceBreakdown>();
}
