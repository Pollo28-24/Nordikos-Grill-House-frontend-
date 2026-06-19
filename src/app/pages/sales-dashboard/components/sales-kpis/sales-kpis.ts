import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-sales-kpis',
  standalone: true,
  imports: [DecimalPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block;
    width: 100%;
    margin-bottom: 1.5rem; }
  `],
  template: `
    <section class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Ingresos Totales -->
      <div class="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-[#1E1E1E] transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/25">
        <div class="absolute inset-0 bg-gradient-to-tr from-[#FFB300]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="flex items-center justify-between relative z-10">
          <div>
            <p class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Ingresos Totales</p>
            <h2 class="text-3xl font-black text-[#FFB300] mt-2 tracking-tight font-mono">&#36;{{ totalRevenue() | number:'1.2-2' }}</h2>
          </div>
          <div class="w-11 h-11 rounded-xl bg-[#FFB300]/10 flex items-center justify-center border border-[#FFB300]/20">
            <lucide-icon name="dollar-sign" class="w-5 h-5 text-[#FFB300]"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Órdenes Completadas -->
      <div class="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-[#1E1E1E] transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/25">
        <div class="absolute inset-0 bg-gradient-to-tr from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="flex items-center justify-between relative z-10">
          <div>
            <p class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Órdenes Pagadas</p>
            <h2 class="text-3xl font-black text-white mt-2 tracking-tight font-mono">{{ totalOrdersCount() }}</h2>
          </div>
          <div class="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
            <lucide-icon name="check-circle-2" class="w-5 h-5 text-blue-400"></lucide-icon>
          </div>
        </div>
      </div>

      <!-- Ticket Promedio -->
      <div class="bg-[#181818] border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-[#1E1E1E] transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/25">
        <div class="absolute inset-0 bg-gradient-to-tr from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div class="flex items-center justify-between relative z-10">
          <div>
            <p class="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Ticket Promedio</p>
            <h2 class="text-3xl font-black text-white mt-2 tracking-tight font-mono">&#36;{{ averageTicket() | number:'1.2-2' }}</h2>
          </div>
          <div class="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <lucide-icon name="receipt" class="w-5 h-5 text-emerald-400"></lucide-icon>
          </div>
        </div>
      </div>
    </section>
  `
})
export class SalesKpis {
  totalRevenue = input.required<number>();
  totalOrdersCount = input.required<number>();
  averageTicket = input.required<number>();
}
