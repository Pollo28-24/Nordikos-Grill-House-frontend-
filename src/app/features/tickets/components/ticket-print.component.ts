import { Component, inject, signal, input, effect, output, ViewEncapsulation } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { TicketService } from '../services/ticket.service';
import { TicketData } from '../models/ticket.model';

@Component({
  selector: 'app-ticket-print',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './ticket-print.component.html',
  styleUrls: ['./ticket-print.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TicketPrintComponent {
  private ticketService = inject(TicketService);

  orderId = input.required<string | number>();
  ticketType = input<'account' | 'kitchen'>('account');
  ticketData = signal<TicketData | null>(null);
  loading = signal(false);
  readyToPrint = output<void>();

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
    
    if (data) {
      // Pequeño delay para asegurar que el DOM se renderice antes de avisar que está listo
      setTimeout(() => {
        if (!this.loading()) {
          this.readyToPrint.emit();
        }
      }, 500);
    }
  }

  print() {
    if (this.ticketData()) {
      this.ticketService.printTicket();
    }
  }
}
