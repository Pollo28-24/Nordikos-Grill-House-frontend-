import { EscPosCommand } from '../../domain/models/escpos-command.model';

export class EscPosEncoder {
  static encodeToBytes(commands: readonly EscPosCommand[]): Uint8Array {
    const bytes: number[] = [];

    // Helper para empujar secuencias de bytes
    const push = (...vals: number[]) => bytes.push(...vals);

    // Mapeo seguro de caracteres especiales en español a CP850/ASCII
    const sanitizeChar = (char: string): number => {
      switch (char) {
        case 'á': return 0xa0;
        case 'é': return 0x82;
        case 'í': return 0xa1;
        case 'ó': return 0xa2;
        case 'ú': return 0xa3;
        case 'ñ': return 0xa4;
        case 'Á': return 0x41; // A fallback
        case 'É': return 0x90;
        case 'Í': return 0x49; // I fallback
        case 'Ó': return 0x4f; // O fallback
        case 'Ú': return 0x55; // U fallback
        case 'Ñ': return 0xa5;
        case '¿': return 0xa8;
        case '¡': return 0xad;
        default:
          const code = char.charCodeAt(0);
          return code < 128 ? code : 0x3f; // '?' si no es mapeable
      }
    };

    for (const cmd of commands) {
      switch (cmd.type) {
        case 'init':
          push(0x1b, 0x40); // ESC @
          break;

        case 'align':
          if (cmd.align === 'center') {
            push(0x1b, 0x61, 0x01); // ESC a 1
          } else if (cmd.align === 'right') {
            push(0x1b, 0x61, 0x02); // ESC a 2
          } else {
            push(0x1b, 0x61, 0x00); // ESC a 0
          }
          break;

        case 'bold':
          push(0x1b, 0x45, cmd.enabled ? 0x01 : 0x00); // ESC E n
          break;

        case 'doubleSize':
          push(0x1d, 0x21, cmd.enabled ? 0x11 : 0x00); // GS ! n
          break;

        case 'text':
          for (let i = 0; i < cmd.text.length; i++) {
            bytes.push(sanitizeChar(cmd.text[i]));
          }
          bytes.push(0x0a); // LF
          break;

        case 'feed':
          push(0x1b, 0x64, Math.max(1, cmd.lines)); // ESC d n
          break;

        case 'cut':
          push(0x1d, 0x56, cmd.mode === 'full' ? 0x00 : 0x01); // GS V n
          break;

        case 'barcode':
          bytes.push(0x0a);
          break;
      }
    }

    return new Uint8Array(bytes);
  }

  static encodeToString(commands: readonly EscPosCommand[]): string {
    const bytes = this.encodeToBytes(commands);
    let str = '';
    for (let i = 0; i < bytes.length; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    return str;
  }
}
