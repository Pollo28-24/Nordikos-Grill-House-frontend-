export interface OrderCreateModifier {
  nombre_modificador: string;
  cantidad: number;
  precio_unitario?: number;
}

export interface OrderCreateItem {
  producto_id?: number | string;
  variante_id?: number | string;
  nombre_producto?: string;
  cantidad: number;
  modificadores?: OrderCreateModifier[];
}

export interface OrderCreateDto {
  cliente_id?: number | string;
  metodo_pago_id: number | string;
  tipo_servicio_id: number | string;
  turno_id: number | string;
  propina?: number;
  items: OrderCreateItem[];
  client_request_id: string;
}

export type OrderCreateResponse =
  | { status: 'success'; order_id: number; total: number }
  | { status: 'validation_error'; error_code: 'PRODUCT_NOT_AVAILABLE' | 'PAYMENT_METHOD_INVALID' | 'SERVICE_TYPE_INVALID' | 'SHIFT_INVALID' }
  | { status: 'conflict'; order_id: number; total: number; error_code: 'IDEMPOTENCY_CONFLICT' };

