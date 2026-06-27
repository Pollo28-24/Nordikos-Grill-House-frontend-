import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { Navbar } from '@shared/components/navbar/navbar';
import { ToastService } from '@core/services/toast.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [LucideAngularModule, Navbar, CommonModule],
  templateUrl: './home.html',
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private toastService = inject(ToastService);
  menuUrl = 'https://nordikos-grill-house-frontend.vercel.app/menu';

  copyLink() {
    navigator.clipboard.writeText(this.menuUrl).then(() => {
      this.toastService.show('¡Enlace copiado al portapapeles!', 'success');
    }).catch(() => {
      this.toastService.show('Error al copiar el enlace', 'error');
    });
  }

  shareWhatsApp() {
    const message = `¡Echa un vistazo al menú de Nórdicos Grill House! ${this.menuUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }
}
