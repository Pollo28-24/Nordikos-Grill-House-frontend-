const ORDER_CREATE_ERROR_MESSAGES: Record<string, string> = {
  PRODUCT_NOT_AVAILABLE:
    'Uno o más productos, variantes o modificadores seleccionados no están disponibles o están agotados.',
  PAYMENT_METHOD_INVALID:
    'El método de pago seleccionado no es válido o no está disponible.',
  SERVICE_TYPE_INVALID:
    'El tipo de servicio seleccionado no es válido.',
  SHIFT_INVALID:
    'El turno seleccionado no es válido o no está disponible.',
  IDEMPOTENCY_CONFLICT:
    'Esta orden ya fue registrada previamente en el sistema.',
};

/** Traduce un `error_code` del RPC `orders_create_v1` a un mensaje claro en español para el cajero. */
export function translateOrderCreateError(
  errorCode?: string | null,
  fallbackMessage?: string
): string {
  const normalized = typeof errorCode === 'string' ? errorCode.trim() : '';
  if (normalized && ORDER_CREATE_ERROR_MESSAGES[normalized]) {
    return ORDER_CREATE_ERROR_MESSAGES[normalized];
  }
  return fallbackMessage || 'No se pudo procesar la orden por un error de validación.';
}
