import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { NgClass } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed top-6 right-6 z-50 flex flex-col gap-3 w-85 max-w-[90vw]">

      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="group relative flex items-start gap-3 px-4 py-3
                 rounded-2xl bg-[#181818]
                 border border-white/5
                 shadow-[0_12px_32px_rgba(0,0,0,0.55)]
                 backdrop-blur-md
                 animate-toast-in"
        >

          <!-- Left Accent Glow -->
          <div
            class="absolute inset-y-0 left-0 w-1 rounded-l-2xl"
            [ngClass]="{
              'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]': toast.type === 'success',
              'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]': toast.type === 'error',
              'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]': toast.type === 'warning',
              'bg-[#FFB300] shadow-[0_0_12px_rgba(255,179,0,0.6)]': toast.type === 'info'
            }"
          ></div>

          <!-- Icon -->
          <div
            class="mt-0.5 shrink-0"
            [ngClass]="{
              'text-emerald-400': toast.type === 'success',
              'text-red-400': toast.type === 'error',
              'text-yellow-400': toast.type === 'warning',
              'text-[#FFB300]': toast.type === 'info'
            }"
          >
            <lucide-icon
              [name]="
                toast.type === 'success' ? 'check-circle' :
                toast.type === 'error' ? 'x-circle' :
                toast.type === 'warning' ? 'alert-triangle' :
                'info'
              "
              class="w-5 h-5"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 pr-2">
            <p class="text-sm font-medium text-[#F5F5F5] leading-snug">
              {{ toast.message }}
            </p>
          </div>

          <!-- Close -->
          <button
            (click)="toastService.remove(toast.id)"
            class="opacity-0 group-hover:opacity-100
                   transition-opacity duration-200
                   text-zinc-400 hover:text-white"
          >
            <lucide-icon name="x" class="w-4 h-4" />
          </button>

        </div>
      }

    </div>
  `,
  styles: [`
    @keyframes toastIn {
      from {
        opacity: 0;
        transform: translateY(-10px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .animate-toast-in {
      animation: toastIn 0.22s cubic-bezier(.2,.8,.2,1) forwards;
    }
  `]
})
export class ToastComponent {
  toastService = inject(ToastService);
}
