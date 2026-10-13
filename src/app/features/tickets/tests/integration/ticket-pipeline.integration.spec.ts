import { TicketDocumentBuilder } from '../../domain/builders/ticket-document.builder';
import { CustomerAccountPolicy, KitchenOrderPolicy } from '../../domain/policies/ticket.policy';
import { HtmlTicketRenderer } from '../../infrastructure/renderers/html-ticket.renderer';
import { EscPosTicketRenderer } from '../../infrastructure/renderers/escpos-ticket.renderer';
import { PdfTicketRenderer } from '../../infrastructure/renderers/pdf-ticket.renderer';
import { EscPosEncoder } from '../../infrastructure/encoders/escpos.encoder';

import { 
  MOCK_HAMBURGER_ORDER, 
  MOCK_WALK_IN_ORDER, 
  MOCK_EMPTY_ORDER 
} from '../fixtures/order.fixtures';
import { PrintableOrder } from '../../domain/models/printable-order.model';

describe('Ticket Pipeline Integration (End-to-End Document Flow)', () => {
  let htmlRenderer: HtmlTicketRenderer;
  let escPosRenderer: EscPosTicketRenderer;

  beforeEach(() => {
    htmlRenderer = new HtmlTicketRenderer();
    escPosRenderer = new EscPosTicketRenderer();
  });

  describe('1. HTML Customer Account Pipeline', () => {
    it('should process PrintableOrder -> Builder -> HtmlRenderer into a complete, valid customer document', () => {
      // 1. Build document using Customer Policy
      const document = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, {
        policy: CustomerAccountPolicy
      });

      // 2. Render full HTML output
      const output = htmlRenderer.render(document, {
        destination: 'web',
        profile: 'pos58',
        widthCharacters: 32
      });

      // 3. Assertions on output structure
      expect(output.mediaType).toBe('text/html');
      expect(output.payload).toContain('<!DOCTYPE html>');
      expect(output.payload).toContain('<html>');

      
      // Branding & Header
      expect(output.payload).toContain('Nórdicos');
      expect(output.payload).toContain('Grill House');
      expect(output.payload).toContain('ORDEN #24');
      expect(output.payload).toContain('MESA 4');
      expect(output.payload).toContain('Comedor');

      // Customer
      expect(output.payload).toContain('Carlos Gardel');
      expect(output.payload).toContain('555-123456');

      // Line items with variants, notes and modifiers
      expect(output.payload).toContain('Hamburguesa Nórdika Doble');
      expect(output.payload).toContain('Pan brioche');
      expect(output.payload).toContain('+ Tocineta Extra');
      expect(output.payload).toContain('Sin cebolla');

      // General note
      expect(output.payload).toContain('Término medio, por favor');

      // Financial breakdown
      expect(output.payload).toContain('Subtotal:');
      expect(output.payload).toContain('$190.00');
      expect(output.payload).toContain('Propina:');
      expect(output.payload).toContain('$25.00');
      expect(output.payload).toContain('TOTAL:');
      expect(output.payload).toContain('$215.00');

      // Farewell
      expect(output.payload).toContain('¡Gracias por su preferencia!');
    });
  });


  describe('2. ESC/POS Hardware Binary Pipeline', () => {
    it('should process PrintableOrder -> Builder -> EscPosRenderer -> Encoder into deterministic printer bytes', () => {
      // 1. Build document
      const document = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, {
        policy: CustomerAccountPolicy
      });

      // 2. Compile to ESC/POS commands
      const commands = escPosRenderer.compileToCommands(document, {
        destination: 'bluetooth',
        profile: 'pos58',
        widthCharacters: 32
      });

      // 3. Encode to raw bytes
      const bytes = EscPosEncoder.encodeToBytes(commands);

      // Verify binary framing
      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(50);

      // Start with INIT (ESC @)
      expect(bytes[0]).toBe(0x1b);
      expect(bytes[1]).toBe(0x40);

      // Ends with partial cut (GS V 1)
      const lastThree = bytes.slice(bytes.length - 3);
      expect(lastThree[0]).toBe(0x1d);
      expect(lastThree[1]).toBe(0x56);
      expect(lastThree[2]).toBe(0x01);

      // String payload contains expected text and CP850 encoded character for 'ó'
      const stringOutput = EscPosEncoder.encodeToString(commands);
      expect(stringOutput.toUpperCase()).toContain('RDICOS');
      expect(stringOutput).toContain('ORDEN #24');
      expect(stringOutput).toContain('TOTAL:');
      expect(stringOutput).toContain('215.00');
    });
  });

  describe('3. Kitchen Policy Pipeline Invariants', () => {
    it('should enforce strict kitchen isolation: items and notes present, but NO prices, totals or footer', () => {
      // 1. Build with Kitchen Policy
      const kitchenDoc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, {
        policy: KitchenOrderPolicy
      });

      // Metadata
      expect(kitchenDoc.metadata.documentType).toBe('kitchen');

      // HTML Output verification
      const htmlFragment = htmlRenderer.renderHtmlFragment(kitchenDoc);
      expect(htmlFragment).toContain('*** COCINA ***');
      expect(htmlFragment).toContain('Hamburguesa Nórdika Doble');
      expect(htmlFragment).toContain('Tocineta Extra');
      expect(htmlFragment).toContain('Sin cebolla');
      expect(htmlFragment).toContain('Término medio, por favor');

      // STRICT NEGATIVE ASSERTIONS (Zero financial data leaks to kitchen)
      expect(htmlFragment).not.toContain('$');
      expect(htmlFragment).not.toContain('SUBTOTAL:');
      expect(htmlFragment).not.toContain('PROPINA:');
      expect(htmlFragment).not.toContain('TOTAL:');
      expect(htmlFragment).not.toContain('¡GRACIAS POR SU PREFERENCIA!');

      // ESC/POS Commands verification
      const commands = escPosRenderer.compileToCommands(kitchenDoc, {
        destination: 'bluetooth',
        profile: 'pos58',
        widthCharacters: 32
      });
      const textOutput = EscPosEncoder.encodeToString(commands);

      expect(textOutput).toContain('*** COCINA ***');
      expect(textOutput).toContain('Hamburguesa');
      expect(textOutput).not.toContain('$');
      expect(textOutput).not.toContain('TOTAL:');
      expect(textOutput).not.toContain('PROPINA:');
    });
  });

  describe('4. Empty Order Pipeline Resilience', () => {
    it('should gracefully handle empty orders without throwing or creating malformed markup', () => {
      const document = TicketDocumentBuilder.build(MOCK_EMPTY_ORDER, {
        policy: CustomerAccountPolicy
      });

      // HTML Render
      const html = htmlRenderer.renderHtmlFragment(document);
      expect(html).toContain('ORDEN #26');
      expect(html).toContain('TOTAL:');
      expect(html).toContain('$0.00');
      expect(html).not.toContain('NaN');
      expect(html).not.toContain('undefined');

      // ESC/POS Render
      const commands = escPosRenderer.compileToCommands(document);
      const bytes = EscPosEncoder.encodeToBytes(commands);
      expect(bytes.length).toBeGreaterThan(0);
      expect(bytes[0]).toBe(0x1b);
      expect(bytes[1]).toBe(0x40);
    });
  });

  describe('5. Walk-in / Bar Order Pipeline', () => {
    it('should omit customer section cleanly when order is anonymous', () => {
      const document = TicketDocumentBuilder.build(MOCK_WALK_IN_ORDER, {
        policy: CustomerAccountPolicy
      });

      const html = htmlRenderer.renderHtmlFragment(document);
      expect(html).toContain('ORDEN #25');
      expect(html).toContain('Barra');
      expect(html).toContain('Papas Rústicas');

      expect(html).not.toContain('Cliente:');
      expect(html).not.toContain('Tel:');

      const commands = escPosRenderer.compileToCommands(document);
      const text = EscPosEncoder.encodeToString(commands);
      expect(text).not.toContain('Cliente:');
    });
  });

  describe('6. Spanish Character Set Integrity Across All Channels', () => {
    it('should preserve and encode all Spanish vowels, accents, Ñ and punctuation marks accurately', () => {
      const spanishOrder: PrintableOrder = Object.freeze({
        id: 999,
        numeroOrden: 99,
        fechaCreacion: '2026-10-12T22:00:00.000Z',
        estadoPedido: 'completado',
        estadoPago: 'pagado',
        total: 100,
        propina: 0,
        tipoServicio: 'Comedor',
        notaGeneral: '¡Atención: término medio y rápido, por favor!',
        cliente: Object.freeze({
          nombre: 'Íñigo Peña de la Oña'
        }),
        items: Object.freeze([
          Object.freeze({
            id: 1,
            orderId: 999,
            nombreProducto: 'Champiñón Asado & Jalapeños',
            cantidad: 1,
            precioUnitario: 100,
            total: 100,
            nota: '¿Tiene limón extra?',
            variante: 'Porción clásica',
            modificadores: Object.freeze([])
          })
        ])
      });

      // 1. Build Document
      const document = TicketDocumentBuilder.build(spanishOrder, {
        policy: CustomerAccountPolicy
      });

      // 2. HTML Channel Test
      const html = htmlRenderer.renderHtmlFragment(document);
      expect(html).toContain('Íñigo Peña de la Oña');
      expect(html).toContain('Champiñón Asado & Jalapeños');
      expect(html).toContain('¿Tiene limón extra?');
      expect(html).toContain('¡Atención: término medio y rápido, por favor!');

      // 3. ESC/POS Channel Test (CP850 byte mapping)
      const commands = escPosRenderer.compileToCommands(document);
      const bytes = EscPosEncoder.encodeToBytes(commands);

      // Verify CP850 mappings exist in the byte stream
      // 'ñ' -> 0xa4
      expect(bytes).toContain(0xa4);
      // 'ó' -> 0xa2
      expect(bytes).toContain(0xa2);
      // 'é' -> 0x82
      expect(bytes).toContain(0x82);
      // '¿' -> 0xa8
      expect(bytes).toContain(0xa8);
      // '¡' -> 0xad
      expect(bytes).toContain(0xad);
    });
  });

  describe('7. Deterministic Snapshot Contract', () => {
    it('should generate deterministic HTML fragment matching snapshot structure', () => {
      const document = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, {
        policy: CustomerAccountPolicy
      });
      const fragment = htmlRenderer.renderHtmlFragment(document);

      // Snapshot structural anchors
      expect(fragment.startsWith('<div class="ticket " style="width: 48mm; max-width: 48mm;">')).toBeTrue();
      expect(fragment.endsWith('</div>')).toBeTrue();
      expect(fragment).toContain('<h1 class="brand">Nórdicos</h1>');
      expect(fragment).toContain('<p class="tagline">Grill House</p>');
      expect(fragment).toContain('<h2 class="order-id">ORDEN #24</h2>');
      expect(fragment).toContain('<div class="item-line"><span class="item-qty">1x</span><span class="item-name">Hamburguesa Nórdika Doble</span><span class="item-total">$190.00</span></div>');
      expect(fragment).toContain('<div class="total-line grand-total"><span>TOTAL:</span><span>$215.00</span></div>');
    });
  });

  describe('8. PDF Vector Document Pipeline', () => {
    it('should process PrintableOrder -> Builder -> PdfRenderer into pure in-memory PDF binary stream', async () => {
      const pdfRenderer = new PdfTicketRenderer();
      const document = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, {
        policy: CustomerAccountPolicy
      });

      const output = await pdfRenderer.render(document);

      expect(output.mediaType).toBe('application/pdf');
      expect(output.payload).toBeInstanceOf(Uint8Array);
      expect(output.payload.length).toBeGreaterThan(500);

      // Verify canonical PDF header %PDF-
      expect(output.payload[0]).toBe(0x25); // %
      expect(output.payload[1]).toBe(0x50); // P
      expect(output.payload[2]).toBe(0x44); // D
      expect(output.payload[3]).toBe(0x46); // F
      expect(output.payload[4]).toBe(0x2d); // -
    });
  });
});

