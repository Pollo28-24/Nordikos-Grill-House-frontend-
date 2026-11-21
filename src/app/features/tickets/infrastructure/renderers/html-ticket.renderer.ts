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
import { PosTicketTheme } from './themes/pos-ticket.theme';

export class HtmlTicketRenderer implements TicketRenderer<RenderOutput<string>> {

  render(document: TicketDocument, context: RenderContext = DEFAULT_RENDER_CONTEXT): RenderOutput<string> {
    const fullHtml = this.renderFullHtmlPage(document, context);
    return {
      mediaType: 'text/html',
      payload: fullHtml
    };
  }

  renderHtmlFragment(document: TicketDocument, context: RenderContext = DEFAULT_RENDER_CONTEXT): string {
    const isKitchen = document.metadata.documentType === 'kitchen';
    const paperWidth = context.profile === 'pos80' ? '72mm' : '48mm';

    let html = `<div class="ticket ${isKitchen ? 'kitchen-ticket' : ''}" style="width: ${paperWidth}; max-width: ${paperWidth};">`;

    for (const section of document.sections) {
      switch (section.type) {
        case 'header':
          html += this.renderHeader(section);
          break;
        case 'customer':
          html += this.renderCustomer(section);
          break;
        case 'items':
          html += this.renderItems(section);
          break;
        case 'totals':
          html += this.renderTotals(section);
          break;
        case 'notes':
          html += this.renderNotes(section);
          break;
        case 'footer':
          html += this.renderFooter(section);
          break;
      }
    }

    html += `</div>`;
    return html;
  }

  renderFullHtmlPage(document: TicketDocument, context: RenderContext = DEFAULT_RENDER_CONTEXT): string {
    const bodyContent = this.renderHtmlFragment(document, context);
    const styles = PosTicketTheme.getStyles(context.profile);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket - ${document.metadata.orderNumber ? 'Orden #' + document.metadata.orderNumber : 'Orden #' + document.metadata.orderId}</title>
  <style>${styles}</style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;
  }

  private renderHeader(header: HeaderSection): string {
    const dateFormatted = this.formatDate(header.timestamp);
    let out = `<div class="header">`;

    if (header.brandName) {
      out += `<h1 class="brand">${header.brandName}</h1>`;
      if (header.tagline) {
        out += `<p class="tagline">${header.tagline}</p>`;
      }
    }

    out += `<div class="ticket-header-main">`;
    out += `<div class="divider"></div>`;
    out += `<h2 class="order-id">${header.orderIdentifier}</h2>`;
    out += `<div class="divider"></div>`;

    if (header.isKitchenBadge) {
      out += `<p class="ticket-label">*** COCINA ***</p>`;
    }
    out += `</div>`;

    out += `<div class="header-details">`;
    out += `<p class="timestamp">${dateFormatted}</p>`;
    if (header.serviceType) {
      out += `<p class="service-type">${header.serviceType}${header.tableNumber ? ' · MESA ' + header.tableNumber : ''}</p>`;
    }
    out += `</div>`;
    out += `</div>`;
    out += `<div class="divider"></div>`;

    return out;
  }

  private renderCustomer(customer: CustomerSection): string {
    let out = `<div class="client">`;
    out += `<p class="client-name">Cliente: ${customer.name}</p>`;
    if (customer.phone) {
      out += `<p>Tel: ${customer.phone}</p>`;
    }
    out += `</div>`;
    out += `<div class="divider"></div>`;
    return out;
  }

  private renderItems(itemsSection: ItemsSection): string {
    let out = `<div class="items">`;

    for (const item of itemsSection.items) {
      out += `<div class="item-block">`;
      out += `<div class="item-line">`;
      out += `<span class="item-qty">${item.quantity}x</span>`;
      out += `<span class="item-name">${item.name}</span>`;
      if (itemsSection.showPrices) {
        out += `<span class="item-total">$${item.total.toFixed(2)}</span>`;
      }
      out += `</div>`;

      if (item.variant || item.modifiers.length > 0) {
        out += `<div class="modifiers">`;
        if (item.variant) {
          out += `<p class="variant-line">• ${item.variant}</p>`;
        }
        for (const mod of item.modifiers) {
          out += `<div class="modifier-line">`;
          out += `<span>+ ${mod.name}</span>`;
          if (itemsSection.showPrices && mod.unitPrice > 0) {
            out += `<span>$${mod.total.toFixed(2)}</span>`;
          }
          out += `</div>`;
        }
        out += `</div>`;
      }

      if (item.note) {
        out += `<p class="item-note">Nota: ${item.note}</p>`;
      }
      out += `</div>`;
    }

    out += `</div>`;
    out += `<div class="divider"></div>`;
    return out;
  }

  private renderTotals(totalsSection: TotalsSection): string {
    let out = `<div class="totals">`;

    for (const entry of totalsSection.entries) {
      const isGrand = entry.isHighlighted;
      out += `<div class="total-line ${isGrand ? 'grand-total' : ''}">`;
      out += `<span>${entry.label}:</span>`;
      out += `<span>$${entry.amount.toFixed(2)}</span>`;
      out += `</div>`;
    }

    out += `</div>`;
    out += `<div class="divider"></div>`;
    return out;
  }

  private renderNotes(notesSection: NotesSection): string {
    if (!notesSection.generalNote) return '';
    return `<div class="general-note">
      <div class="note-title">*** NOTA ESPECIAL ***</div>
      <div class="note-content">${notesSection.generalNote}</div>
    </div>
    <div class="divider"></div>`;
  }

  private renderFooter(footerSection: FooterSection): string {
    let out = `<div class="footer">`;
    if (footerSection.message) {
      out += `<p>${footerSection.message}</p>`;
    }
    out += `<div class="barcode">||| |||| ||||| |||| |||</div>`;
    out += `</div>`;
    return out;
  }

  private formatDate(isoDate: string): string {
    try {
      const d = new Date(isoDate);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString().substring(2);
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
      hours = hours % 12 || 12;
      return `${day}/${month}/${year}, ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch {
      return isoDate;
    }
  }
}
