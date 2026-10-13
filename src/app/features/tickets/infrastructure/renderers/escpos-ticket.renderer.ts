import { TicketRenderer } from '../../domain/ports/ticket-renderer.port';
import { TicketDocument } from '../../domain/models/ticket-document.model';
import { RenderContext, DEFAULT_RENDER_CONTEXT } from '../../domain/models/render-context.model';
import { TicketLayoutCompiler } from '../../domain/compilers/ticket-layout.compiler';
import { ProfileLayoutCompiler } from '../../domain/compilers/profile-layout.compiler';
import { EscPosCommand } from '../../domain/models/escpos-command.model';
import { EscPosEncoder } from '../encoders/escpos.encoder';
import { RenderOutput } from '../../domain/models/render-output.model';

export class EscPosTicketRenderer implements TicketRenderer<RenderOutput<string>> {
  render(document: TicketDocument, context: RenderContext = DEFAULT_RENDER_CONTEXT): RenderOutput<string> {
    const commands = this.compileToCommands(document, context);
    const payload = EscPosEncoder.encodeToString(commands);

    return {
      mediaType: 'application/octet-stream',
      payload
    };
  }

  compileToCommands(document: TicketDocument, context: RenderContext = DEFAULT_RENDER_CONTEXT): EscPosCommand[] {
    const logical = TicketLayoutCompiler.compile(document);
    const physical = ProfileLayoutCompiler.compile(logical, {
      ...context,
      widthCharacters: context.widthCharacters ?? 32,
      showCutCommand: true
    });

    const commands: EscPosCommand[] = [
      { type: 'init' }
    ];

    for (const node of physical.nodes) {
      switch (node.type) {
        case 'text':
          commands.push({ type: 'align', align: node.align });
          if (node.bold) commands.push({ type: 'bold', enabled: true });
          if (node.size === 'double') commands.push({ type: 'doubleSize', enabled: true });

          commands.push({ type: 'text', text: node.text });

          if (node.bold) commands.push({ type: 'bold', enabled: false });
          if (node.size === 'double') commands.push({ type: 'doubleSize', enabled: false });
          break;

        case 'twoColumn': {
          commands.push({ type: 'align', align: 'left' });
          if (node.bold) commands.push({ type: 'bold', enabled: true });

          const totalWidth = node.width;
          const spaceCount = Math.max(1, totalWidth - node.left.length - node.right.length);
          const line = `${node.left}${' '.repeat(spaceCount)}${node.right}`;

          commands.push({ type: 'text', text: line });
          if (node.bold) commands.push({ type: 'bold', enabled: false });
          break;
        }

        case 'line':
          commands.push({ type: 'align', align: 'left' });
          commands.push({ type: 'text', text: node.char.repeat(node.count) });
          break;

        case 'feed':
          commands.push({ type: 'feed', lines: node.lines });
          break;

        case 'cut':
          commands.push({ type: 'cut', mode: node.mode });
          break;

        case 'barcode':
          commands.push({ type: 'barcode', code: node.code });
          break;
      }
    }

    return commands;
  }
}
