import { PdfTicketRenderer } from '../../infrastructure/renderers/pdf-ticket.renderer';
import { TicketDocumentBuilder } from '../../domain/builders/ticket-document.builder';
import { CustomerAccountPolicy, KitchenOrderPolicy } from '../../domain/policies/ticket.policy';
import { MOCK_HAMBURGER_ORDER, MOCK_EMPTY_ORDER } from '../fixtures/order.fixtures';

describe('PdfTicketRenderer (Vector In-Memory PDF Generation)', () => {
  let renderer: PdfTicketRenderer;

  beforeEach(() => {
    renderer = new PdfTicketRenderer();
  });

  it('should render RenderOutput with mediaType application/pdf and pure Uint8Array payload', async () => {
    const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: CustomerAccountPolicy });
    const output = await renderer.render(doc);

    expect(output.mediaType).toBe('application/pdf');
    expect(output.payload).toBeInstanceOf(Uint8Array);
    expect(output.payload.length).toBeGreaterThan(100);

    // Verificamos cabecera mágica canónica de PDF: %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
    expect(output.payload[0]).toBe(0x25); // '%'
    expect(output.payload[1]).toBe(0x50); // 'P'
    expect(output.payload[2]).toBe(0x44); // 'D'
    expect(output.payload[3]).toBe(0x46); // 'F'
    expect(output.payload[4]).toBe(0x2d); // '-'
  });

  it('should render kitchen document without throwing', async () => {
    const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: KitchenOrderPolicy });
    const output = await renderer.render(doc);

    expect(output.mediaType).toBe('application/pdf');
    expect(output.payload.length).toBeGreaterThan(100);
  });

  it('should render empty order document with valid PDF binary framing', async () => {
    const doc = TicketDocumentBuilder.build(MOCK_EMPTY_ORDER, { policy: CustomerAccountPolicy });
    const output = await renderer.render(doc);

    expect(output.mediaType).toBe('application/pdf');
    expect(output.payload[0]).toBe(0x25);
    expect(output.payload[1]).toBe(0x50);
  });

  it('should handle pos80 profile geometry context accurately', async () => {
    const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: CustomerAccountPolicy });
    const output = await renderer.render(doc, {
      destination: 'pdf',
      profile: 'pos80',
      widthCharacters: 42
    });

    expect(output.mediaType).toBe('application/pdf');
    expect(output.payload.length).toBeGreaterThan(100);
  });
});
