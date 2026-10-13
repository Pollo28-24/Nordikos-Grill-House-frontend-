import { HtmlTicketRenderer } from '../../infrastructure/renderers/html-ticket.renderer';
import { TicketDocumentBuilder } from '../../domain/builders/ticket-document.builder';
import { CustomerAccountPolicy, KitchenOrderPolicy } from '../../domain/policies/ticket.policy';
import { MOCK_HAMBURGER_ORDER } from '../fixtures/order.fixtures';

describe('HtmlTicketRenderer (Deterministic Markup Generation)', () => {
  let renderer: HtmlTicketRenderer;

  beforeEach(() => {
    renderer = new HtmlTicketRenderer();
  });

  it('should render RenderOutput with mediaType text/html and complete HTML shell', () => {
    const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: CustomerAccountPolicy });
    const output = renderer.render(doc);

    expect(output.mediaType).toBe('text/html');
    expect(output.payload).toContain('<!DOCTYPE html>');
    expect(output.payload).toContain('ORDEN #24');
    expect(output.payload).toContain('Hamburguesa Nórdika Doble');
    expect(output.payload).toContain('$215.00');
  });

  it('should render HTML fragment matching kitchen policy without totals or prices', () => {
    const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: KitchenOrderPolicy });
    const html = renderer.renderHtmlFragment(doc);

    expect(html).toContain('kitchen-ticket');
    expect(html).toContain('*** COCINA ***');
    expect(html).toContain('Hamburguesa Nórdika Doble');
    expect(html).not.toContain('TOTAL');
    expect(html).not.toContain('¡Gracias por su preferencia!');
  });

  it('should include customer details and modifiers in fragment', () => {
    const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: CustomerAccountPolicy });
    const html = renderer.renderHtmlFragment(doc);

    expect(html).toContain('Carlos Gardel');
    expect(html).toContain('555-123456');
    expect(html).toContain('Tocineta Extra');
    expect(html).toContain('Término medio, por favor');
  });

  it('should format styles and width correctly for pos80 profile', () => {
    const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: CustomerAccountPolicy });
    const output = renderer.render(doc, {
      destination: 'web',
      profile: 'pos80',
      widthCharacters: 42
    });

    expect(output.payload).toContain('72mm');
    expect(output.payload).toContain('80mm auto');
  });
});

