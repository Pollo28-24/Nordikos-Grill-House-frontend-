import { Component, inject, signal, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketService } from '../services/ticket.service';
import { TicketData } from '../models/ticket.model';

@Component({
  selector: 'app-ticket-print',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-print.component.html',
  styleUrls: ['./ticket-print.component.css']
})
export class TicketPrintComponent {
  private ticketService = inject(TicketService);

  orderId = input.required<string | number>();
  ticketType = input<'account' | 'kitchen'>('account');
  ticketData = signal<TicketData | null>(null);
  loading = signal(false);

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
    const data = await this.ticketService.getTicketData(id);
    this.ticketData.set(data);
    this.loading.set(false);
  }

  print() {
    this.ticketService.printTicket();
  }
}
