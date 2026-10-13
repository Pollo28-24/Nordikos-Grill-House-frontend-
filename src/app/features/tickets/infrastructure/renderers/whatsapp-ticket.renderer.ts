import { TicketRenderer } from '../../domain/ports/ticket-renderer.port';
import { TicketDocument } from '../../domain/models/ticket-document.model';
import { RenderContext, DEFAULT_RENDER_CONTEXT } from '../../domain/models/render-context.model';
import { TicketLayoutCompiler } from '../../domain/compilers/ticket-layout.compiler';
import { ProfileLayoutCompiler } from '../../domain/compilers/profile-layout.compiler';

export class WhatsappTicketRenderer implements TicketRenderer<string> {
  render(document: TicketDocument, context: RenderContext = DEFAULT_RENDER_CONTEXT): string {
    const logical = TicketLayoutCompiler.compile(document);
    const physical = ProfileLayoutCompiler.compile(logical, {
      ...context,
      widthCharacters: context.widthCharacters ?? 30,
      showCutCommand: false
    });

    const lines: string[] = [];

    for (const node of physical.nodes) {
      switch (node.type) {
        case 'text':
          if (node.bold) {
            lines.push(`*${node.text}*`);
          } else {
            lines.push(node.text);
          }
          break;

        case 'twoColumn': {
          const totalWidth = node.width;
          const left = node.left;
          const right = node.right;
          const spaceCount = Math.max(1, totalWidth - left.length - right.length);
          const line = `${left}${' '.repeat(spaceCount)}${right}`;
          lines.push(node.bold ? `*${line}*` : line);
          break;
        }

        case 'line':
          lines.push(node.char.repeat(node.count));
          break;

        case 'feed':
        case 'cut':
        case 'barcode':
          // Omitidos en mensajería digital
          break;
      }
    }

    return lines.join('\n');
  }
}
