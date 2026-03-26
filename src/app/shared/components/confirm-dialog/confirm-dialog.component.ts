import {
  Component,
  inject,
  ChangeDetectionStrategy,
  HostListener
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmService } from '../../../core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirmService.state(); as confirm) {
      <div
        class="fixed inset-0 z-50
               bg-black/70 backdrop-blur-md
               flex items-center justify-center
               animate-overlay"
        (click)="confirmService.close()"
      >
        <div
          (click)="$event.stopPropagation()"
          class="w-full max-w-sm mx-4
                 rounded-3xl
                 bg-[#1A1A1A]
                 border border-white/5
                 shadow-[0_30px_80px_rgba(0,0,0,0.7)]
                 p-8 text-center
                 animate-modal"
        >

          <!-- Icon -->
          <div class="flex justify-center mb-5">
            <div
              class="w-14 h-14 flex items-center justify-center
                     rounded-2xl
                     bg-red-500/10
                     border border-red-500/20"
            >
              <i-lucide
                name="alert-triangle"
                class="w-6 h-6 text-red-500"
              />
            </div>
          </div>

          <!-- Title -->
          <h3 class="text-lg font-semibold text-white tracking-tight">
            {{ confirm.title || 'Confirmar acción' }}
          </h3>

          <!-- Message -->
          <p class="text-sm text-zinc-400 mt-3 leading-relaxed">
            {{ confirm.message }}
          </p>

          <!-- Buttons -->
          <div class="flex gap-4 mt-8">
            <button
              (click)="confirmService.close()"
              class="flex-1 px-4 py-2.5
                     rounded-xl
                     border border-white/10
                     text-zinc-300
                     hover:bg-white/5
                     transition"
            >
              {{ confirm.cancelText }}
            </button>

            <button
              (click)="confirmService.confirm()"
              class="flex-1 px-4 py-2.5
                     rounded-xl
                     bg-red-600
                     text-white
                     hover:bg-red-500
                     transition
                     font-medium"
            >
              {{ confirm.confirmText }}
            </button>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes overlayFade {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes modalScale {
      from { opacity: 0; transform: scale(0.94) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .animate-overlay {
      animation: overlayFade 0.18s ease-out forwards;
    }

    .animate-modal {
      animation: modalScale 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
  `]
})
export class ConfirmDialogComponent {

  confirmService = inject(ConfirmService);

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.confirmService.state()) {
      this.confirmService.close();
    }
  }
}
