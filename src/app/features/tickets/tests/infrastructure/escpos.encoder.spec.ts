import { EscPosEncoder } from '../../infrastructure/encoders/escpos.encoder';
import { EscPosCommand } from '../../domain/models/escpos-command.model';

describe('EscPosEncoder (Thermal Hardware Byte Encoding)', () => {

  it('should encode init command to ESC @ [0x1B, 0x40]', () => {
    const commands: EscPosCommand[] = [{ type: 'init' }];
    const bytes = EscPosEncoder.encodeToBytes(commands);

    expect(bytes.length).toBe(2);
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
  });

  it('should encode alignment commands correctly', () => {
    const leftCmds: EscPosCommand[] = [{ type: 'align', align: 'left' }];
    const centerCmds: EscPosCommand[] = [{ type: 'align', align: 'center' }];
    const rightCmds: EscPosCommand[] = [{ type: 'align', align: 'right' }];

    const leftBytes = EscPosEncoder.encodeToBytes(leftCmds);
    const centerBytes = EscPosEncoder.encodeToBytes(centerCmds);
    const rightBytes = EscPosEncoder.encodeToBytes(rightCmds);

    expect(leftBytes).toEqual(new Uint8Array([0x1b, 0x61, 0x00]));
    expect(centerBytes).toEqual(new Uint8Array([0x1b, 0x61, 0x01]));
    expect(rightBytes).toEqual(new Uint8Array([0x1b, 0x61, 0x02]));
  });

  it('should encode bold command on/off', () => {
    const onBytes = EscPosEncoder.encodeToBytes([{ type: 'bold', enabled: true }]);
    const offBytes = EscPosEncoder.encodeToBytes([{ type: 'bold', enabled: false }]);

    expect(onBytes).toEqual(new Uint8Array([0x1b, 0x45, 0x01]));
    expect(offBytes).toEqual(new Uint8Array([0x1b, 0x45, 0x00]));
  });

  it('should sanitize Spanish characters into CP850 bytes without corrupting printer', () => {
    const textCommands: EscPosCommand[] = [
      { type: 'text', text: '¡Buen provecho, señor! Jalapeños' }
    ];
    const bytes = EscPosEncoder.encodeToBytes(textCommands);

    // Verificamos que contenga los códigos de CP850 esperados:
    // '¡' -> 0xad
    expect(bytes[0]).toBe(0xad);
    // 'ñ' -> 0xa4
    expect(bytes).toContain(0xa4);
    // Termina con LF (0x0A)
    expect(bytes[bytes.length - 1]).toBe(0x0a);
  });

  it('should encode feed and partial cut commands', () => {
    const commands: EscPosCommand[] = [
      { type: 'feed', lines: 3 },
      { type: 'cut', mode: 'partial' }
    ];
    const bytes = EscPosEncoder.encodeToBytes(commands);

    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x64);
    expect(bytes[2]).toBe(0x03); // Feed 3 lines

    expect(bytes[3]).toBe(0x1d);
    expect(bytes[4]).toBe(0x56);
    expect(bytes[5]).toBe(0x01); // Partial cut
  });

  it('should encode full cut and double size on/off', () => {
    const doubleOn = EscPosEncoder.encodeToBytes([{ type: 'doubleSize', enabled: true }]);
    const doubleOff = EscPosEncoder.encodeToBytes([{ type: 'doubleSize', enabled: false }]);
    const fullCut = EscPosEncoder.encodeToBytes([{ type: 'cut', mode: 'full' }]);
    const barcode = EscPosEncoder.encodeToBytes([{ type: 'barcode', code: '12345' }]);

    expect(doubleOn).toEqual(new Uint8Array([0x1d, 0x21, 0x11]));
    expect(doubleOff).toEqual(new Uint8Array([0x1d, 0x21, 0x00]));
    expect(fullCut).toEqual(new Uint8Array([0x1d, 0x56, 0x00]));
    expect(barcode).toEqual(new Uint8Array([0x0a]));
  });

  it('should handle all uppercase and lowercase Spanish accents plus unmappable fallback', () => {
    const text = 'áéíóúÁÉÍÓÚñÑ¿¡🚀';
    const bytes = EscPosEncoder.encodeToBytes([{ type: 'text', text }]);

    // á: 0xa0, é: 0x82, í: 0xa1, ó: 0xa2, ú: 0xa3
    expect(bytes[0]).toBe(0xa0);
    expect(bytes[1]).toBe(0x82);
    expect(bytes[2]).toBe(0xa1);
    expect(bytes[3]).toBe(0xa2);
    expect(bytes[4]).toBe(0xa3);

    // Á: 0x41, É: 0x90, Í: 0x49, Ó: 0x4f, Ú: 0x55
    expect(bytes[5]).toBe(0x41);
    expect(bytes[6]).toBe(0x90);
    expect(bytes[7]).toBe(0x49);
    expect(bytes[8]).toBe(0x4f);
    expect(bytes[9]).toBe(0x55);

    // ñ: 0xa4, Ñ: 0xa5, ¿: 0xa8, ¡: 0xad
    expect(bytes[10]).toBe(0xa4);
    expect(bytes[11]).toBe(0xa5);
    expect(bytes[12]).toBe(0xa8);
    expect(bytes[13]).toBe(0xad);

    // 🚀 (unicode > 128 sin mapeo) -> fallback a 0x3f ('?')
    expect(bytes[14]).toBe(0x3f);
  });

  it('should encode binary string accurately matching bytes', () => {
    const commands: EscPosCommand[] = [
      { type: 'init' },
      { type: 'text', text: 'OK' }
    ];
    const str = EscPosEncoder.encodeToString(commands);
    expect(str.startsWith('\x1b@')).toBeTrue();
    expect(str.includes('OK')).toBeTrue();
  });
});

