import {
  Component,
  inject,
  ChangeDetectionStrategy,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ConfirmService } from '@core/services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirmService.state(); as confirm) {
      <div
        class="fixed inset-0 z-50
               bg-black/70 backdrop-blur-md
               flex items-center justify-center
               animate-overlay no-print"
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
                     rounded-2xl"
              [ngClass]="confirm.isDanger ? 'bg-red-500/10 border border-red-500/20' : 'bg-amber-500/10 border border-amber-500/20'"
            >
              <i-lucide
                [name]="confirm.isDanger ? 'alert-triangle' : 'info'"
                class="w-6 h-6"
                [ngClass]="confirm.isDanger ? 'text-red-500' : 'text-amber-500'"
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

          <!-- Input Field -->
          @if (confirm.showInput) {
            <div class="mt-6">
              <textarea
                [placeholder]="confirm.inputPlaceholder || 'Escribe aquí...'"
                class="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-colors resize-none h-24"
                [ngModel]="confirmService.inputValue()"
                (ngModelChange)="confirmService.setInputValue($event)"
                autofocus
              ></textarea>
            </div>
          }

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
                     transition
                     font-medium"
              [ngClass]="confirm.isDanger ? 'bg-red-600 text-white hover:bg-red-500' : 'bg-amber-500 text-black hover:bg-amber-400'"
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
