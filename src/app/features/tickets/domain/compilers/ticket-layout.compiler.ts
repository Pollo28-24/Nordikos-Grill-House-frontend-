import { TicketDocument } from '../models/ticket-document.model';
import { LogicalLayout, LogicalNode } from '../models/logical-layout.model';

export class TicketLayoutCompiler {
  static compile(document: TicketDocument): LogicalLayout {
    const nodes: LogicalNode[] = [];
    let counter = 0;
    const nextId = () => `node-${++counter}`;

    for (const section of document.sections) {
      switch (section.type) {
        case 'header':
          nodes.push({
            id: nextId(),
            type: 'header',
            title: section.brandName || 'Nórdicos',
            subtitle: section.tagline,
            identifier: section.orderIdentifier,
            timestamp: section.timestamp
          });

          if (section.isKitchenBadge) {
            nodes.push({
              id: nextId(),
              type: 'badge',
              text: '*** COCINA ***'
            });
          }

          if (section.serviceType) {
            nodes.push({
              id: nextId(),
              type: 'keyValue',
              label: 'Servicio',
              value: `${section.serviceType}${section.tableNumber ? ' · MESA ' + section.tableNumber : ''}`
            });
          }

          nodes.push({ id: nextId(), type: 'divider', style: 'dashed' });
          break;

        case 'customer':
          nodes.push({
            id: nextId(),
            type: 'keyValue',
            label: 'Cliente',
            value: section.name
          });
          if (section.phone) {
            nodes.push({
              id: nextId(),
              type: 'keyValue',
              label: 'Tel',
              value: section.phone
            });
          }
          nodes.push({ id: nextId(), type: 'divider', style: 'dashed' });
          break;

        case 'items':
          for (const item of section.items) {
            nodes.push({
              id: nextId(),
              type: 'productRow',
              quantity: item.quantity,
              name: item.name,
              unitPrice: section.showPrices ? item.unitPrice : undefined,
              total: section.showPrices ? item.total : undefined,
              variant: item.variant,
              note: item.note
            });

            for (const mod of item.modifiers) {
              nodes.push({
                id: nextId(),
                type: 'modifierRow',
                name: mod.name,
                quantity: mod.quantity,
                total: section.showPrices && mod.unitPrice > 0 ? mod.total : undefined
              });
            }
          }
          nodes.push({ id: nextId(), type: 'divider', style: 'dashed' });
          break;

        case 'totals':
          for (const entry of section.entries) {
            nodes.push({
              id: nextId(),
              type: 'totalsRow',
              label: entry.label,
              amount: entry.amount,
              isHighlighted: entry.isHighlighted
            });
          }
          nodes.push({ id: nextId(), type: 'divider', style: 'dashed' });
          break;

        case 'notes':
          if (section.generalNote) {
            nodes.push({
              id: nextId(),
              type: 'note',
              title: 'NOTA ESPECIAL',
              content: section.generalNote
            });
            nodes.push({ id: nextId(), type: 'divider', style: 'dashed' });
          }
          break;

        case 'footer':
          if (section.message) {
            nodes.push({
              id: nextId(),
              type: 'footer',
              message: section.message
            });
          }
          break;
      }
    }

    return Object.freeze({
      documentId: `doc-${document.metadata.orderId}`,
      nodes: Object.freeze(nodes)
    });
  }
}
