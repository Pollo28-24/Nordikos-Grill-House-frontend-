import { OrderRequestLocation } from '@core/models/order.model';

const META_LOCATION_REGEX = /\[meta:(\{.*?\})\]/;

export interface ParsedOrderNote {
  cleanNote: string | null;
  location: OrderRequestLocation | null;
}

/**
 * Parses structured JSON metadata (like GPS coordinates) embedded in nota_general,
 * returning the clean human note and the extracted location object.
 */
export function parseLocationMetadata(note: string | null | undefined): ParsedOrderNote {
  if (!note || typeof note !== 'string') {
    return { cleanNote: null, location: null };
  }

  const match = note.match(META_LOCATION_REGEX);
  let location: OrderRequestLocation | null = null;

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed?.location && typeof parsed.location.latitude === 'number' && typeof parsed.location.longitude === 'number') {
        location = {
          latitude: parsed.location.latitude,
          longitude: parsed.location.longitude,
          accuracy: typeof parsed.location.accuracy === 'number' ? parsed.location.accuracy : undefined,
        };
      }
    } catch {
      // Ignore JSON parse errors gracefully
    }
  }

  const cleanNote = note.replace(META_LOCATION_REGEX, '').trim() || null;
  return { cleanNote, location };
}

/**
 * Generates a Google Maps URL from GPS coordinates (pinpoint accuracy)
 * or falls back to an encoded search query using the textual address.
 */
export function getGoogleMapsUrl(
  location?: OrderRequestLocation | null,
  address?: string | null
): string | null {
  if (location && typeof location.latitude === 'number' && typeof location.longitude === 'number') {
    return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
  }

  if (address && address.trim().length > 0) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`;
  }

  return null;
}

/**
 * Builds a formatted WhatsApp URL to share the delivery briefing with
 * the repartidor (delivery driver) or delivery staff.
 */
export function getDeliveryWhatsAppShareUrl(options: {
  orderCode: string | number;
  clientName?: string | null;
  phone?: string | null;
  address?: string | null;
  location?: OrderRequestLocation | null;
  note?: string | null;
  total?: number | null;
}): string {
  const { orderCode, clientName, phone, address, location, note, total } = options;
  const mapsUrl = getGoogleMapsUrl(location, address);

  const lines: string[] = [
    `🛵 *Entrega Nórdicos Grill House*`,
    `📋 *Pedido:* #${orderCode}`,
  ];

  if (clientName?.trim()) {
    lines.push(`👤 *Cliente:* ${clientName.trim()}`);
  }

  if (phone?.trim()) {
    lines.push(`📞 *Teléfono:* ${phone.trim()}`);
  }

  if (address?.trim()) {
    lines.push(`📍 *Dirección:* ${address.trim()}`);
  }

  if (mapsUrl) {
    lines.push(`🗺️ *Google Maps:* ${mapsUrl}`);
  }

  if (note?.trim()) {
    lines.push(`💬 *Nota:* ${note.trim()}`);
  }

  if (typeof total === 'number' && total > 0) {
    lines.push(`💰 *Total a Cobrar:* $${total.toFixed(2)}`);
  }

  const message = lines.join('\n');
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
