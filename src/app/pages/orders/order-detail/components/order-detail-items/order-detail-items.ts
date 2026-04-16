import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-order-detail-items',
  standalone: true,
  imports: [CommonModule, DecimalPipe, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 mb-8">
      <div class="flex items-center justify-between px-2">
        <h3 class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Productos en la Orden</h3>
        @if (order()?.nota_general) {
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <lucide-icon name="info" class="w-3.5 h-3.5" />
            <span class="text-[10px] font-bold uppercase tracking-wider">Nota General</span>
          </div>
        }
      </div>
      
      @if (order()?.nota_general) {
        <div class="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 mb-4 animate-in fade-in slide-in-from-top-2">
          <p class="text-sm text-amber-200/80 italic leading-relaxed">
            "{{ order()?.nota_general }}"
          </p>
        </div>
      }
      
      <div class="space-y-2">
        @for (item of items(); track item.id) {
          <div class="p-4 rounded-2xl bg-[#1E1E1E] border border-white/5 flex items-center justify-between group">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-1">
                <span class="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center text-xs font-black">
                  {{ item.cantidad }}
                </span>
                <span class="font-bold text-white">{{ item.nombre_producto }}</span>
              </div>
              
              @if (item.nota) {
                <p class="text-[11px] text-amber-400 italic ml-9 mt-1">
                  "{{ item.nota }}"
                </p>
              }

              @if (item.modificadores?.length > 0) {
                <div class="ml-9 mt-1.5 flex flex-wrap gap-1.5">
                  @for (m of item.modificadores; track m.id) {
                    <span class="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                      + {{ m.nombre_modificador }}
                    </span>
                  }
                </div>
              }
            </div>

            <div class="text-right">
              <span class="text-sm font-bold text-white">\${{ (item.precio_unitario * item.cantidad) | number:'1.2-2' }}</span>
              <p class="text-[10px] text-zinc-500 mt-1">\${{ item.precio_unitario }} c/u</p>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class OrderDetailItems {
  order = input.required<any>();
  items = input.required<any[]>();
}
