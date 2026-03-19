export type OrderStatus = 'pendiente' | 'confirmado' | 'entregado' | 'cancelado';
export type PaymentStatus = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado';

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
  nota?: string;
  modificadores?: OrderCreateModifier[];
}

export interface OrderCreateDto {
  cliente_id?: number | string;
  metodo_pago_id: number | string;
  tipo_servicio_id: number | string;
  turno_id?: number | string; // Opcional por ahora
  estado_pedido?: OrderStatus;
  estado_pago?: PaymentStatus;
  propina?: number;
  nota_general?: string; // Nuevo campo
  items: OrderCreateItem[];
  client_request_id: string;
}

export type OrderCreateResponse =
  | { status: 'success'; order_id: number; total: number }
  | { status: 'validation_error'; error_code: 'PRODUCT_NOT_AVAILABLE' | 'PAYMENT_METHOD_INVALID' | 'SERVICE_TYPE_INVALID' | 'SHIFT_INVALID' }
  | { status: 'conflict'; order_id: number; total: number; error_code: 'IDEMPOTENCY_CONFLICT' };

export interface Order {
  id: number;
  numero_orden?: number;
  cliente_id: number | null;
  metodo_pago_id: number;
  tipo_servicio_id: number;
  turno_id: number | null;
  estado_pedido: OrderStatus;
  estado_pago: PaymentStatus;
  total: number;
  propina: number;
  nota_general?: string;
  fecha_creacion: string;
  client_request_id: string;
}

