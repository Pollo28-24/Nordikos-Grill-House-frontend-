import { Injectable } from '@angular/core';
import { PrintDestination } from '../../domain/models/render-context.model';
import { TicketRenderer } from '../../domain/ports/ticket-renderer.port';
import { HtmlTicketRenderer } from './html-ticket.renderer';
import { EscPosTicketRenderer } from './escpos-ticket.renderer';
import { WhatsappTicketRenderer } from './whatsapp-ticket.renderer';
import { PdfTicketRenderer } from './pdf-ticket.renderer';

@Injectable({
  providedIn: 'root'
})
export class RendererFactory {
  private renderers = new Map<PrintDestination, TicketRenderer<any>>();

  constructor() {
    this.renderers.set('web', new HtmlTicketRenderer());
    this.renderers.set('bluetooth', new EscPosTicketRenderer());
    this.renderers.set('whatsapp', new WhatsappTicketRenderer());
    this.renderers.set('pdf', new PdfTicketRenderer());
  }


  register(destination: PrintDestination, renderer: TicketRenderer<any>): void {
    this.renderers.set(destination, renderer);
  }

  get(destination: PrintDestination): TicketRenderer<any> {
    const renderer = this.renderers.get(destination);
    if (!renderer) {
      throw new Error(`No se encontró un renderizador registrado para el destino: ${destination}`);
    }
    return renderer;
  }
}
