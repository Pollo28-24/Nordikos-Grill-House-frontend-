import { LogicalLayout } from '../models/logical-layout.model';
import { PhysicalLayout, PhysicalNode } from '../models/physical-layout.model';
import { RenderContext, DEFAULT_RENDER_CONTEXT } from '../models/render-context.model';

export class ProfileLayoutCompiler {
  static compile(logical: LogicalLayout, context: RenderContext = DEFAULT_RENDER_CONTEXT): PhysicalLayout {
    const width = context.widthCharacters ?? (context.profile === 'pos80' ? 42 : 32);
    const nodes: PhysicalNode[] = [];

    for (const node of logical.nodes) {
      switch (node.type) {
        case 'header':
          nodes.push({
            type: 'text',
            text: node.title,
            align: 'center',
            bold: true,
            size: 'double'
          });
          if (node.subtitle) {
            nodes.push({
              type: 'text',
              text: node.subtitle,
              align: 'center',
              bold: true,
              size: 'normal'
            });
          }
          nodes.push({
            type: 'text',
            text: node.identifier,
            align: 'left',
            bold: true,
            size: 'normal'
          });
          nodes.push({
            type: 'text',
            text: `Fecha: ${this.formatDate(node.timestamp)}`,
            align: 'left',
            bold: false,
            size: 'normal'
          });
          break;

        case 'badge':
          nodes.push({
            type: 'text',
            text: node.text,
            align: 'center',
            bold: true,
            size: 'normal'
          });
          break;

        case 'keyValue':
          nodes.push({
            type: 'twoColumn',
            left: `${node.label}:`,
            right: node.value,
            width,
            bold: false
          });
          break;

        case 'productRow': {
          const left = `${node.quantity}x ${node.name}`;
          const right = node.total !== undefined ? `$${node.total.toFixed(2)}` : '';
          nodes.push({
            type: 'twoColumn',
            left,
            right,
            width,
            bold: true
          });
          if (node.variant) {
            nodes.push({
              type: 'text',
              text: `  • ${node.variant}`,
              align: 'left',
              bold: false,
              size: 'normal'
            });
          }
          if (node.note) {
            nodes.push({
              type: 'text',
              text: `  Nota: ${node.note}`,
              align: 'left',
              bold: false,
              size: 'normal'
            });
          }
          break;
        }

        case 'modifierRow': {
          const left = `  + ${node.name}`;
          const right = node.total !== undefined ? `$${node.total.toFixed(2)}` : '';
          nodes.push({
            type: 'twoColumn',
            left,
            right,
            width,
            bold: false
          });
          break;
        }

        case 'totalsRow':
          nodes.push({
            type: 'twoColumn',
            left: `${node.label}:`,
            right: `$${node.amount.toFixed(2)}`,
            width,
            bold: !!node.isHighlighted,
            fillChar: ' '
          });
          break;

        case 'divider':
          nodes.push({
            type: 'line',
            char: '-',
            count: width
          });
          break;

        case 'note':
          if (node.title) {
            nodes.push({
              type: 'text',
              text: `*** ${node.title} ***`,
              align: 'center',
              bold: true,
              size: 'normal'
            });
          }
          nodes.push({
            type: 'text',
            text: node.content,
            align: 'center',
            bold: true,
            size: 'normal'
          });
          break;

        case 'footer':
          nodes.push({
            type: 'text',
            text: node.message,
            align: 'center',
            bold: true,
            size: 'normal'
          });
          nodes.push({
            type: 'barcode',
            code: 'NORDIKOS'
          });
          break;
      }
    }

    if (context.showCutCommand) {
      nodes.push({ type: 'feed', lines: 3 });
      nodes.push({ type: 'cut', mode: 'partial' });
    }

    return Object.freeze({
      widthCharacters: width,
      nodes: Object.freeze(nodes)
    });
  }

  private static formatDate(isoDate: string): string {
    try {
      const d = new Date(isoDate);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear().toString().substring(2);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return isoDate;
    }
  }
}
