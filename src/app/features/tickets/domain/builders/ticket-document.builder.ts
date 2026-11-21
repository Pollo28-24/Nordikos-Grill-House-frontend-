import { PrintableOrder } from '../models/printable-order.model';
import { 
  TicketDocument, 
  TicketDocumentType, 
  TicketSection, 
  HeaderSection, 
  CustomerSection, 
  ItemsSection, 
  TotalsSection, 
  NotesSection, 
  FooterSection, 
  ProductItem, 
  TotalEntry 
} from '../models/ticket-document.model';
import { TicketPolicy, CustomerAccountPolicy, KitchenOrderPolicy } from '../policies/ticket.policy';

export interface TicketBuildOptions {
  policy?: TicketPolicy;
  documentType?: TicketDocumentType;
  brandName?: string;
  tagline?: string;
  footerMessage?: string;
  currency?: string;
  locale?: string;
}

export class TicketDocumentBuilder {
  static build(order: PrintableOrder, options?: TicketBuildOptions): TicketDocument {
    const policy = options?.policy ?? (options?.documentType === 'kitchen' ? KitchenOrderPolicy : CustomerAccountPolicy);
    const documentType: TicketDocumentType = (policy.name as TicketDocumentType) || 'account';
    const sections: TicketSection[] = [];

    // 1. Sección de Encabezado (gobernada por la política)
    const header: HeaderSection = {
      id: 'section-header',
      type: 'header',
      brandName: policy.includeBranding ? (options?.brandName ?? 'Nórdicos') : undefined,
      tagline: policy.includeBranding ? (options?.tagline ?? 'Grill House') : undefined,
      orderIdentifier: order.numeroOrden ? `ORDEN #${order.numeroOrden}` : `ORDEN #${order.id}`,
      serviceType: order.tipoServicio,
      tableNumber: order.numeroMesa,
      timestamp: order.fechaCreacion,
      isKitchenBadge: policy.isKitchenBadge
    };
    sections.push(header);

    // 2. Sección de Cliente (si existe)
    if (order.cliente && order.cliente.nombre) {
      const customer: CustomerSection = {
        id: 'section-customer',
        type: 'customer',
        name: order.cliente.nombre,
        phone: order.cliente.telefono
      };
      sections.push(customer);
    }

    // 3. Sección de Productos (gobernada por la política)
    const products: ProductItem[] = order.items.map(item => ({
      id: item.id,
      name: item.nombreProducto,
      quantity: item.cantidad,
      unitPrice: item.precioUnitario,
      total: item.total,
      note: item.nota,
      variant: item.variante,
      modifiers: item.modificadores.map(mod => ({
        name: mod.nombre,
        quantity: mod.cantidad,
        unitPrice: mod.precioUnitario,
        total: mod.cantidad * mod.precioUnitario
      }))
    }));

    const itemsSection: ItemsSection = {
      id: 'section-items',
      type: 'items',
      items: Object.freeze(products),
      showPrices: policy.includePrices
    };
    sections.push(itemsSection);

    // 4. Sección de Totales (gobernada por la política)
    if (policy.includeTotals) {
      const entries: TotalEntry[] = [];
      const subtotalCalculado = products.reduce((acc, p) => acc + p.total, 0);

      if (order.propina > 0 || subtotalCalculado !== order.total) {
        entries.push({
          key: 'subtotal',
          label: 'Subtotal',
          amount: subtotalCalculado
        });
      }

      if (order.propina > 0) {
        entries.push({
          key: 'tip',
          label: 'Propina',
          amount: order.propina
        });
      }

      entries.push({
        key: 'total',
        label: 'TOTAL',
        amount: order.total,
        isHighlighted: true
      });

      const totalsSection: TotalsSection = {
        id: 'section-totals',
        type: 'totals',
        entries: Object.freeze(entries)
      };
      sections.push(totalsSection);
    }

    // 5. Sección de Notas Generales
    if (order.notaGeneral && order.notaGeneral.trim().length > 0) {
      const notesSection: NotesSection = {
        id: 'section-notes',
        type: 'notes',
        generalNote: order.notaGeneral.trim()
      };
      sections.push(notesSection);
    }

    // 6. Sección de Pie de Ticket (gobernada por la política)
    if (policy.includeFooter) {
      const footer: FooterSection = {
        id: 'section-footer',
        type: 'footer',
        message: options?.footerMessage ?? '¡Gracias por su preferencia!'
      };
      sections.push(footer);
    }

    return Object.freeze({
      metadata: Object.freeze({
        documentType,
        orderId: order.id,
        orderNumber: order.numeroOrden,
        createdAt: order.fechaCreacion,
        currency: options?.currency ?? 'MXN',
        locale: options?.locale ?? 'es-MX'
      }),
      sections: Object.freeze(sections)
    });
  }
}
