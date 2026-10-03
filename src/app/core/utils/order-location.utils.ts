import { OrderRequestLocation } from '@core/models/order.model';

const META_JSON_REGEX = /\[meta:(\{.*?\})\]/;

export interface ParsedOrderNote {
  cleanNote: string | null;
  location: OrderRequestLocation | null;
}

export interface ParsedOrderMetadata {
  cleanNote: string | null;
  location: OrderRequestLocation | null;
  paymentMethod: string | null;
}

/**
 * Parses structured JSON metadata (location, payment method, etc.) embedded in nota_general,
 * returning clean human note, extracted GPS location, and chosen payment method.
 */
export function parseOrderMetadata(note: string | null | undefined): ParsedOrderMetadata {
  if (!note || typeof note !== 'string') {
    return { cleanNote: null, location: null, paymentMethod: null };
  }

  const match = note.match(META_JSON_REGEX);
  let location: OrderRequestLocation | null = null;
  let paymentMethod: string | null = null;

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
      if (parsed?.payment_method && typeof parsed.payment_method === 'string') {
        paymentMethod = parsed.payment_method;
      }
    } catch {
      // Ignore JSON parse errors gracefully
    }
  }

  const cleanNote = note.replace(META_JSON_REGEX, '').trim() || null;
  return { cleanNote, location, paymentMethod };
}

/**
 * Parses structured JSON metadata (like GPS coordinates) embedded in nota_general,
 * returning the clean human note and the extracted location object.
 * Maintained for backward compatibility.
 */
export function parseLocationMetadata(note: string | null | undefined): ParsedOrderNote {
  const meta = parseOrderMetadata(note);
  return { cleanNote: meta.cleanNote, location: meta.location };
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
  references?: string | null;
  location?: OrderRequestLocation | null;
  note?: string | null;
  total?: number | null;
}): string {
  const { orderCode, clientName, phone, address, references, location, note, total } = options;
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

  if (references?.trim()) {
    lines.push(`📝 *Referencias:* ${references.trim()}`);
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
