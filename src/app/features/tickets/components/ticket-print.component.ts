import { Component, inject, signal, input, effect, output, ViewEncapsulation } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TicketService } from '../services/ticket.service';
import { TicketData } from '../models/ticket.model';
import { ToastService } from '@core/services/toast.service';

@Component({
  selector: 'app-ticket-print',
  standalone: true,
  imports: [DatePipe, DecimalPipe, LucideAngularModule],
  templateUrl: './ticket-print.component.html',
  styleUrls: ['./ticket-print.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TicketPrintComponent {
  private ticketService = inject(TicketService);
  private toastService = inject(ToastService);

  orderId = input.required<string | number>();
  ticketType = input<'account' | 'kitchen'>('account');
  autoPrint = input<boolean>(true);
  ticketData = signal<TicketData | null>(null);
  loading = signal(false);
  readyToPrint = output<void>();
  close = output<void>();

  constructor() {
    effect(() => {
      const id = this.orderId();
      if (id) {
        this.loadTicket(Number(id));
      }
    });
  }

  async loadTicket(id: number) {
    this.loading.set(true);
    this.ticketData.set(null); // Reset current data
    const data = await this.ticketService.getTicketData(id);
    this.ticketData.set(data);
    this.loading.set(false);
    
    if (data && this.autoPrint()) {
      // Pequeño delay para asegurar que el DOM se renderice antes de avisar que está listo
      setTimeout(() => {
        if (!this.loading()) {
          this.readyToPrint.emit();
        }
      }, 500);
    }
  }

  print() {
    const data = this.ticketData();
    if (data) {
      this.ticketService.printTicket(data);
    }
  }

  async shareOrCopy() {
    const data = this.ticketData();
    if (!data) return;
    const result = await this.ticketService.shareOrCopyTicket(data);
    if (result === 'copied') {
      this.toastService.show('¡Ticket copiado al portapapeles!', 'success');
    } else if (result === 'shared') {
      // Compartido de forma nativa con éxito
    } else {
      this.toastService.show('No se pudo compartir el ticket.', 'error');
    }
  }
}
