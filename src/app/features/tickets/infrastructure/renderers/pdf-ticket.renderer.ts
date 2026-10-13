import { TicketRenderer } from '../../domain/ports/ticket-renderer.port';
import { 
  TicketDocument, 
  HeaderSection, 
  CustomerSection, 
  ItemsSection, 
  TotalsSection, 
  NotesSection, 
  FooterSection 
} from '../../domain/models/ticket-document.model';
import { RenderContext, DEFAULT_RENDER_CONTEXT } from '../../domain/models/render-context.model';
import { RenderOutput } from '../../domain/models/render-output.model';

export class PdfTicketRenderer implements TicketRenderer<Promise<RenderOutput<Uint8Array>>> {

  async render(
    document: TicketDocument, 
    context: RenderContext = DEFAULT_RENDER_CONTEXT
  ): Promise<RenderOutput<Uint8Array>> {
    const { jsPDF } = await import('jspdf');

    // 1. Calcular altura dinámica requerida en mm
    const paperWidth = context.profile === 'pos80' ? 80 : 58;
    const contentWidth = paperWidth - 8; // 4mm de margen a cada lado
    const rightMargin = paperWidth - 4;
    const estimatedHeight = this.calculateRequiredHeight(document, contentWidth);

    // 2. Instanciar documento vectorial en memoria
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [paperWidth, Math.max(70, estimatedHeight)]
    });

    let y = 8;
    const centerX = paperWidth / 2;

    for (const section of document.sections) {
      switch (section.type) {
        case 'header':
          y = this.drawHeader(doc, section, centerX, y);
          break;
        case 'customer':
          y = this.drawCustomer(doc, section, y);
          break;
        case 'items':
          y = this.drawItems(doc, section, y, contentWidth, rightMargin);
          break;
        case 'totals':
          y = this.drawTotals(doc, section, y, rightMargin);
          break;
        case 'notes':
          y = this.drawNotes(doc, section, y, contentWidth);
          break;
        case 'footer':
          y = this.drawFooter(doc, section, centerX, y);
          break;
      }
    }

    // 3. Extraer buffer binario agnóstico de plataforma
    const arrayBuffer = doc.output('arraybuffer');
    const payload = new Uint8Array(arrayBuffer);

    return {
      mediaType: 'application/pdf',
      payload
    };
  }

  private drawHeader(doc: any, header: HeaderSection, centerX: number, y: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(header.brandName ?? 'Nórdicos', centerX, y, { align: 'center' });
    y += 5;

    doc.setFontSize(10);
    doc.text(header.tagline ?? 'Grill House', centerX, y, { align: 'center' });
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('-'.repeat(38), centerX, y, { align: 'center' });
    y += 4;

    doc.setFont('helvetica', 'bold');
    doc.text(header.orderIdentifier, 4, y);
    y += 4.5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    if (header.serviceType) {
      const tableText = header.tableNumber ? ` · MESA ${header.tableNumber}` : '';
      doc.text(`Servicio: ${header.serviceType}${tableText}`, 4, y);
      y += 4;
    }

    const dateFormatted = this.formatDate(header.timestamp);
    doc.text(`Fecha: ${dateFormatted}`, 4, y);
    y += 4.5;

    return y;
  }

  private drawCustomer(doc: any, customer: CustomerSection, y: number): number {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('-'.repeat(38), 29, y, { align: 'center' });
    y += 4;

    doc.text(`Cliente: ${customer.name}`, 4, y);
    y += 4;

    if (customer.phone) {
      doc.text(`Tel: ${customer.phone}`, 4, y);
      y += 4;
    }

    return y;
  }


  private drawItems(doc: any, section: ItemsSection, y: number, contentWidth: number, rightMargin: number): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('-'.repeat(38), 29, y, { align: 'center' });
    y += 4.5;

    doc.text('DETALLE DEL PEDIDO', 4, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);

    const nameColWidth = contentWidth - 14;

    for (const item of section.items) {
      const qtyName = `${item.quantity}x ${item.name}`;
      const splitName = doc.splitTextToSize(qtyName, nameColWidth);
      doc.text(splitName, 4, y);

      if (section.showPrices) {
        const totalStr = `$${item.total.toFixed(2)}`;
        doc.text(totalStr, rightMargin, y, { align: 'right' });
      }

      y += splitName.length * 3.5;

      if (item.variant) {
        doc.setFont('helvetica', 'italic');
        const variantText = `  • ${item.variant}`;
        const splitVariant = doc.splitTextToSize(variantText, nameColWidth);
        doc.text(splitVariant, 4, y);
        y += splitVariant.length * 3.5;
        doc.setFont('helvetica', 'normal');
      }

      for (const mod of item.modifiers) {
        const modText = `  + ${mod.name}`;
        const splitMod = doc.splitTextToSize(modText, nameColWidth);
        doc.text(splitMod, 4, y);

        if (section.showPrices && mod.unitPrice > 0) {
          const modTotalStr = `$${mod.total.toFixed(2)}`;
          doc.text(modTotalStr, rightMargin, y, { align: 'right' });
        }

        y += splitMod.length * 3.5;
      }

      if (item.note) {
        doc.setFont('helvetica', 'italic');
        const noteText = `  (Nota: ${item.note})`;
        const splitNote = doc.splitTextToSize(noteText, nameColWidth);
        doc.text(splitNote, 4, y);
        y += splitNote.length * 3.5;
        doc.setFont('helvetica', 'normal');
      }

      y += 1.5;
    }

    return y;
  }

  private drawTotals(doc: any, totals: TotalsSection, y: number, rightMargin: number): number {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('-'.repeat(38), 29, y, { align: 'center' });
    y += 4.5;

    for (const entry of totals.entries) {
      if (entry.isHighlighted) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }

      doc.text(`${entry.label}:`, 4, y);
      doc.text(`$${entry.amount.toFixed(2)}`, rightMargin, y, { align: 'right' });
      y += 4.5;
    }

    return y;
  }

  private drawNotes(doc: any, notes: NotesSection, y: number, contentWidth: number): number {
    if (!notes.generalNote) return y;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('-'.repeat(38), 29, y, { align: 'center' });
    y += 4.5;

    doc.text('*** NOTA ESPECIAL ***', 4, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    const splitNote = doc.splitTextToSize(notes.generalNote, contentWidth);
    doc.text(splitNote, 4, y);
    y += splitNote.length * 3.5 + 2;

    return y;
  }

  private drawFooter(doc: any, footer: FooterSection, centerX: number, y: number): number {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('-'.repeat(38), centerX, y, { align: 'center' });
    y += 4.5;

    if (footer.message) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(footer.message, centerX, y, { align: 'center' });
      y += 4.5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Sabor que te transporta al norte.', centerX, y, { align: 'center' });
    y += 6;

    return y;
  }

  private calculateRequiredHeight(doc: TicketDocument, contentWidth: number): number {
    let height = 35; // base header

    for (const section of doc.sections) {
      switch (section.type) {
        case 'customer':
          height += 12;
          break;
        case 'items':
          for (const item of section.items) {
            height += 5; // item line
            if (item.variant) height += 4;
            height += item.modifiers.length * 4;
            if (item.note) height += 4;
          }
          height += 8;
          break;
        case 'totals':
          height += section.entries.length * 5 + 6;
          break;
        case 'notes':
          if (section.generalNote) height += 12;
          break;
        case 'footer':
          height += 18;
          break;
      }
    }

    return height;
  }

  private formatDate(iso: string): string {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().substring(2);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}
