import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { ClientOrdersService } from './client-orders.service';
import { ClientSubmittedOrder } from '../models/order.model';

describe('ClientOrdersService', () => {
  let service: ClientOrdersService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        ClientOrdersService,
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });
    service = TestBed.inject(ClientOrdersService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getWhatsAppShareUrl', () => {
    it('should format whatsapp share url with modifiers, payment method and clean note', () => {
      const order: ClientSubmittedOrder = {
        request_code: 'REQ-20261001-002',
        created_at: '2026-10-01T05:30:00.000Z',
        service_name: 'A Domicilio',
        service_code: 'delivery',
        items: [
          {
            id: 'item-1',
            product_id: '10',
            nombre: 'Hamburguesa Nórdika',
            precio: 120,
            cantidad: 1,
            variante: { id: 'v1', nombre: 'Doble Carne', precio: 120 },
            nota: 'Sin mostaza',
            modificadores: [
              { nombre_modificador: 'Queso Extra', cantidad: 1, precio_unitario: 15 },
              { nombre_modificador: 'Tocino Crujiente', cantidad: 2, precio_unitario: 20 }
            ]
          }
        ],
        total: 175,
        cliente: {
          nombre: 'Carlos Mendoza',
          telefono: '9511234567',
          direccion: 'Guadalupe Victoria #4',
          referencias: 'Zaguán negro con timbre blanco'
        },
        metodo_pago: 'transferencia',
        nota_general: 'Tocar fuerte por favor\n[meta:{"location":{"latitude":16.82,"longitude":-96.78}}]',
        location: { latitude: 16.823884, longitude: -96.783625, accuracy: 16 }
      };

      const url = service.getWhatsAppShareUrl(order, '5219512224034');
      expect(url).toContain('https://wa.me/5219512224034?text=');

      const text = decodeURIComponent(url);
      expect(text).toContain('REQ-20261001-002');
      expect(text).toContain('Carlos Mendoza');
      expect(text).toContain('9511234567');
      expect(text).toContain('Guadalupe Victoria #4');
      expect(text).toContain('📝 *Referencias:* Zaguán negro con timbre blanco');
      expect(text).toContain('💳 *Método de Pago:* 📱 Transferencia SPEI');
      expect(text).toContain('• 1x Hamburguesa Nórdika (Doble Carne) - $120.00');
      expect(text).toContain('   + Queso Extra (+$15.00)');
      expect(text).toContain('   + 2x Tocino Crujiente (+$40.00)');
      expect(text).toContain('Sin mostaza');
      expect(text).toContain('💬 *Nota General:* Tocar fuerte por favor');
      expect(text).not.toContain('[meta:');
      expect(text).toContain('💰 *TOTAL:* $175.00');
    });
  });

  describe('CustomerProfile persistence', () => {
    it('should save and load customer profile in localStorage', () => {
      service.saveCustomerProfile({
        nombre: 'Ana López',
        telefono: '9519876543',
        direccion: 'Av. Juárez 100',
        referencias: 'Casa de dos pisos',
        location: { latitude: 17.06, longitude: -96.72 }
      });

      const loaded = service.getCustomerProfile();
      expect(loaded).toBeTruthy();
      expect(loaded?.nombre).toBe('Ana López');
      expect(loaded?.telefono).toBe('9519876543');
      expect(loaded?.direccion).toBe('Av. Juárez 100');
      expect(loaded?.referencias).toBe('Casa de dos pisos');
      expect(loaded?.location?.latitude).toBe(17.06);
    });
  });
});
