import { TicketDocumentBuilder } from '../../domain/builders/ticket-document.builder';
import { CustomerAccountPolicy, KitchenOrderPolicy } from '../../domain/policies/ticket.policy';
import { 
  MOCK_HAMBURGER_ORDER, 
  MOCK_WALK_IN_ORDER, 
  MOCK_EMPTY_ORDER 
} from '../fixtures/order.fixtures';
import { 
  HeaderSection, 
  CustomerSection, 
  ItemsSection, 
  TotalsSection, 
  NotesSection, 
  FooterSection 
} from '../../domain/models/ticket-document.model';

describe('TicketDocumentBuilder (Domain Model Assembly)', () => {

  describe('Customer Account Policy (Comensal / Cobro)', () => {
    it('should build a complete customer document with branding, prices and totals', () => {
      const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: CustomerAccountPolicy });

      expect(doc.metadata.documentType).toBe('account');
      expect(doc.metadata.orderNumber).toBe(24);

      // 1. Header
      const header = doc.sections.find(s => s.type === 'header') as HeaderSection;
      expect(header).toBeDefined();
      expect(header.brandName).toBe('Nórdicos');
      expect(header.isKitchenBadge).toBeFalse();
      expect(header.orderIdentifier).toBe('ORDEN #24');

      // 2. Customer
      const customer = doc.sections.find(s => s.type === 'customer') as CustomerSection;
      expect(customer).toBeDefined();
      expect(customer.name).toBe('Carlos Gardel');

      // 3. Items con precios
      const itemsSec = doc.sections.find(s => s.type === 'items') as ItemsSection;
      expect(itemsSec).toBeDefined();
      expect(itemsSec.showPrices).toBeTrue();
      expect(itemsSec.items.length).toBe(1);
      expect(itemsSec.items[0].name).toBe('Hamburguesa Nórdika Doble');
      expect(itemsSec.items[0].modifiers.length).toBe(1);
      expect(itemsSec.items[0].modifiers[0].name).toBe('Tocineta Extra');

      // 4. Totales
      const totalsSec = doc.sections.find(s => s.type === 'totals') as TotalsSection;
      expect(totalsSec).toBeDefined();
      const totalEntry = totalsSec.entries.find(e => e.key === 'total');
      const tipEntry = totalsSec.entries.find(e => e.key === 'tip');
      expect(totalEntry?.amount).toBe(215);
      expect(tipEntry?.amount).toBe(25);

      // 5. Notas
      const notesSec = doc.sections.find(s => s.type === 'notes') as NotesSection;
      expect(notesSec).toBeDefined();
      expect(notesSec.generalNote).toBe('Término medio, por favor');

      // 6. Footer
      const footer = doc.sections.find(s => s.type === 'footer') as FooterSection;
      expect(footer).toBeDefined();
      expect(footer.message).toBe('¡Gracias por su preferencia!');
    });
  });

  describe('Kitchen Order Policy (Cocina / Comanda)', () => {
    it('should strip prices, branding and totals for kitchen production', () => {
      const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: KitchenOrderPolicy });

      expect(doc.metadata.documentType).toBe('kitchen');

      // Header de cocina con badge
      const header = doc.sections.find(s => s.type === 'header') as HeaderSection;
      expect(header.isKitchenBadge).toBeTrue();
      expect(header.brandName).toBeUndefined();

      // Items sin precios
      const itemsSec = doc.sections.find(s => s.type === 'items') as ItemsSection;
      expect(itemsSec.showPrices).toBeFalse();

      // NO debe tener sección de totales
      const totalsSec = doc.sections.find(s => s.type === 'totals');
      expect(totalsSec).toBeUndefined();

      // NO debe tener pie comercial
      const footerSec = doc.sections.find(s => s.type === 'footer');
      expect(footerSec).toBeUndefined();

      // SÍ debe conservar notas y modificaciones para el cocinero
      const notesSec = doc.sections.find(s => s.type === 'notes') as NotesSection;
      expect(notesSec.generalNote).toBe('Término medio, por favor');
    });
  });

  describe('Edge Cases & Defensive Invariants', () => {
    it('should omit CustomerSection when order has no registered customer', () => {
      const doc = TicketDocumentBuilder.build(MOCK_WALK_IN_ORDER, { policy: CustomerAccountPolicy });
      const customer = doc.sections.find(s => s.type === 'customer');
      expect(customer).toBeUndefined();
    });

    it('should omit NotesSection when general note is empty or absent', () => {
      const doc = TicketDocumentBuilder.build(MOCK_WALK_IN_ORDER, { policy: CustomerAccountPolicy });
      const notes = doc.sections.find(s => s.type === 'notes');
      expect(notes).toBeUndefined();
    });

    it('should safely handle an empty order without throwing', () => {
      const doc = TicketDocumentBuilder.build(MOCK_EMPTY_ORDER, { policy: CustomerAccountPolicy });
      const itemsSec = doc.sections.find(s => s.type === 'items') as ItemsSection;
      expect(itemsSec.items.length).toBe(0);
      expect(doc.metadata.orderNumber).toBe(26);
    });

    it('should produce a frozen immutable document', () => {
      const doc = TicketDocumentBuilder.build(MOCK_HAMBURGER_ORDER, { policy: CustomerAccountPolicy });
      expect(Object.isFrozen(doc)).toBeTrue();
      expect(Object.isFrozen(doc.sections)).toBeTrue();
    });
  });
});
