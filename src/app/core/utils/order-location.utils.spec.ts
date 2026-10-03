import { parseOrderMetadata, parseLocationMetadata, getGoogleMapsUrl, getDeliveryWhatsAppShareUrl } from './order-location.utils';

describe('OrderLocationUtils & OrderMetadataUtils', () => {
  describe('parseOrderMetadata', () => {
    it('should return nulls when note is null or empty', () => {
      expect(parseOrderMetadata(null)).toEqual({ cleanNote: null, location: null, paymentMethod: null });
      expect(parseOrderMetadata('')).toEqual({ cleanNote: null, location: null, paymentMethod: null });
      expect(parseOrderMetadata(undefined)).toEqual({ cleanNote: null, location: null, paymentMethod: null });
    });

    it('should parse a plain note without metadata', () => {
      const result = parseOrderMetadata('Sin cebolla por favor');
      expect(result.cleanNote).toBe('Sin cebolla por favor');
      expect(result.location).toBeNull();
      expect(result.paymentMethod).toBeNull();
    });

    it('should extract location from [meta:{...}]', () => {
      const raw = 'Bien cocido\n[meta:{"location":{"latitude":25.6866,"longitude":-100.3161,"accuracy":12}}]';
      const result = parseOrderMetadata(raw);
      expect(result.cleanNote).toBe('Bien cocido');
      expect(result.location).toEqual({
        latitude: 25.6866,
        longitude: -100.3161,
        accuracy: 12
      });
      expect(result.paymentMethod).toBeNull();
    });

    it('should extract payment method from [meta:{...}]', () => {
      const raw = 'Tocar timbre\n[meta:{"payment_method":"tarjeta"}]';
      const result = parseOrderMetadata(raw);
      expect(result.cleanNote).toBe('Tocar timbre');
      expect(result.location).toBeNull();
      expect(result.paymentMethod).toBe('tarjeta');
    });

    it('should extract both location and payment method when present in [meta:{...}]', () => {
      const raw = 'Llamar al llegar\n[meta:{"location":{"latitude":20.123,"longitude":-101.456},"payment_method":"transferencia"}]';
      const result = parseOrderMetadata(raw);
      expect(result.cleanNote).toBe('Llamar al llegar');
      expect(result.location).toEqual({
        latitude: 20.123,
        longitude: -101.456,
        accuracy: undefined
      });
      expect(result.paymentMethod).toBe('transferencia');
    });

    it('should return null cleanNote if note was only the metadata tag', () => {
      const raw = '[meta:{"payment_method":"efectivo"}]';
      const result = parseOrderMetadata(raw);
      expect(result.cleanNote).toBeNull();
      expect(result.paymentMethod).toBe('efectivo');
    });
  });

  describe('parseLocationMetadata (backward compatibility)', () => {
    it('should maintain existing interface signature', () => {
      const raw = 'Nota de prueba\n[meta:{"location":{"latitude":10,"longitude":20}}]';
      const result = parseLocationMetadata(raw);
      expect(result.cleanNote).toBe('Nota de prueba');
      expect(result.location).toEqual({ latitude: 10, longitude: 20, accuracy: undefined });
    });
  });

  describe('getGoogleMapsUrl', () => {
    it('should prefer GPS coordinates when available', () => {
      const url = getGoogleMapsUrl({ latitude: 25.68, longitude: -100.31 }, 'Calle Falsa 123');
      expect(url).toBe('https://www.google.com/maps?q=25.68,-100.31');
    });

    it('should fall back to encoded textual address when coordinates are missing', () => {
      const url = getGoogleMapsUrl(null, 'Av. Juárez 456, Centro');
      expect(url).toBe('https://www.google.com/maps/search/?api=1&query=Av.%20Ju%C3%A1rez%20456%2C%20Centro');
    });

    it('should return null when neither is provided', () => {
      expect(getGoogleMapsUrl(null, null)).toBeNull();
      expect(getGoogleMapsUrl(undefined, '')).toBeNull();
    });
  });

  describe('getDeliveryWhatsAppShareUrl', () => {
    it('should generate properly formatted whatsapp url with encoded message', () => {
      const url = getDeliveryWhatsAppShareUrl({
        orderCode: 'ORD-999',
        clientName: 'Juan Pérez',
        phone: '1234567890',
        address: 'Colonia Roma Norte',
        location: { latitude: 19.42, longitude: -99.16 },
        note: 'Dejar en recepción',
        total: 350
      });

      expect(url).toContain('https://wa.me/?text=');
      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('ORD-999');
      expect(decoded).toContain('Juan Pérez');
      expect(decoded).toContain('1234567890');
      expect(decoded).toContain('Colonia Roma Norte');
      expect(decoded).toContain('https://www.google.com/maps?q=19.42,-99.16');
      expect(decoded).toContain('Dejar en recepción');
      expect(decoded).toContain('$350.00');
    });

    it('should include delivery references when provided', () => {
      const url = getDeliveryWhatsAppShareUrl({
        orderCode: 'REQ-101',
        clientName: 'María García',
        address: 'Guadalupe Victoria #4',
        references: 'Portón negro frente a la escuela',
        total: 180
      });

      const decoded = decodeURIComponent(url);
      expect(decoded).toContain('Guadalupe Victoria #4');
      expect(decoded).toContain('📝 *Referencias:* Portón negro frente a la escuela');
    });
  });
});
