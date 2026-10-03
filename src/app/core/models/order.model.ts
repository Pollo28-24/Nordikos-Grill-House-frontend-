export type OrderStatus = 'pendiente' | 'confirmado' | 'entregado' | 'cancelado';
export type PaymentStatus = 'pendiente' | 'pagado' | 'fallido' | 'reembolsado';

export interface OrderCreateModifier {
  modificador_id?: number | string;
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
  cliente_id?: number | string | null;
  metodo_pago_id: number | string;
  tipo_servicio_id: number | string;
  turno_id?: number | string | null; // Opcional por ahora
  estado_pedido?: OrderStatus;
  estado_pago?: PaymentStatus;
  propina?: number;
  nota_general?: string | null; // Nuevo campo
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
  numero_mesa?: string | null;
  direccion_entrega?: string | null;
  referencias?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null;
  fecha_creacion: string;
  client_request_id: string;
}

export interface OrderItemModifier {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

export interface OrderItemSimple {
  id: number;
  cantidad: number;
  precio_unitario: number;
  nombre_producto: string;
  nota?: string;
  producto_id: number;
  variante_id?: number;
  modificadores: OrderItemModifier[];
}

export interface OrderListItem {
  id: number;
  numero_orden?: number;
  nota_general?: string;
  fecha_creacion: string;
  fecha_cierre?: string;
  total: number;
  estado_pedido: string;
  estado_pago: string;
  metodo_pago_id: number;
  tipo_servicio_id: number;
  turno_id: number | null;
  cliente_nombre: string;
  tipo_servicio_nombre: string;
  order_items: OrderItemSimple[];
}

export interface OrderRequestLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface CheckoutDraft {
  nombre: string;
  telefono: string;
  email?: string;
  direccion: string;
  referencias?: string;
  tipo_servicio_id: number | null;
  numero_mesa: string;
  nota_general: string;
  location?: OrderRequestLocation | null;
  manualAddressMode?: boolean;
}

export interface CustomerProfile {
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  referencias?: string;
  location?: OrderRequestLocation | null;
}

export interface ClientSubmittedOrderItem {
  id: string;
  product_id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url?: string;
  variante?: {
    id: string;
    nombre: string;
    precio: number;
  };
  nota?: string | null;
  modificadores?: OrderCreateModifier[];
}

export interface ClientSubmittedOrder {
  request_code: string;
  created_at: string;
  service_name: string;
  service_code: 'mesa' | 'llevar' | 'delivery';
  items: ClientSubmittedOrderItem[];
  total: number;
  cliente: {
    nombre: string;
    telefono: string;
    email?: string;
    direccion?: string;
    referencias?: string;
    numero_mesa?: string;
  };
  metodo_pago?: string | null;
  nota_general?: string | null;
  location?: OrderRequestLocation | null;
}

export interface PaymentMethod {
  id: number;
  nombre: string;
  tipo?: string;
}

export interface ServiceType {
  id: number;
  nombre: string;
}

export interface Client {
  id: number;
  nombre: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export interface CartItem {
  cart_item_id: string; // ID único de la línea dentro del carrito
  producto_id: number | string;
  nombre_producto: string;
  
  // Desglose financiero explícito y transparente
  precio_base: number;          // Precio del producto o variante (descuentos aplicados)
  precio_modificadores: number; // Suma de todos los extras/modificadores
  precio_total_unitario: number;// Total unitario (precio_base + precio_modificadores)
  
  // Retrocompatibilidad con plantillas y servicios existentes
  precio_unitario: number;      // Alias a precio_total_unitario
  /** @deprecated Utilizar precio_total_unitario o precio_base según corresponda */
  precio: number;               // Alias a precio_total_unitario
  precio_original?: number;
  descuento?: number;
  cantidad: number;
  imagen_url?: string;
  variante_id?: number | string;
  nombre_variante?: string;
  nota?: string | null;
  modificadores?: OrderCreateModifier[];

  // Compatibilidad hacia atrás garantizada para plantillas existentes
  id: string;
  product_id: string;
  nombre: string;
  variante?: {
    id: string;
    nombre: string;
    precio: number;
  };
}

export function normalizeCartItem(raw: any): CartItem {
  const cartItemId = String(raw.cart_item_id || raw.id || crypto.randomUUID());
  const prodId = raw.producto_id !== undefined && raw.producto_id !== null ? raw.producto_id : (raw.product_id ?? '');
  const nombre = raw.nombre_producto || raw.nombre || '';
  const cant = Number(raw.cantidad || 1);
  const mods = Array.isArray(raw.modificadores) ? raw.modificadores : [];
  
  const rawBase = raw.precio_base !== undefined 
    ? Number(raw.precio_base) 
    : (raw.variante?.precio !== undefined ? Number(raw.variante.precio) : Number(raw.precio_original ?? raw.precio ?? 0));
  
  const rawMods = raw.precio_modificadores !== undefined
    ? Number(raw.precio_modificadores)
    : mods.reduce((sum: number, m: any) => sum + (Number(m.precio_unitario || 0) * Number(m.cantidad || 1)), 0);

  const rawTotal = raw.precio_total_unitario !== undefined
    ? Number(raw.precio_total_unitario)
    : (raw.precio_unitario !== undefined ? Number(raw.precio_unitario) : (rawBase + rawMods));

  const varId = raw.variante_id ?? raw.variante?.id ?? undefined;
  const varNombre = raw.nombre_variante ?? raw.variante?.nombre ?? undefined;
  const varPrecio = raw.variante?.precio !== undefined ? Number(raw.variante.precio) : rawBase;

  return {
    cart_item_id: cartItemId,
    id: cartItemId,
    producto_id: prodId,
    product_id: String(prodId),
    nombre_producto: nombre,
    nombre: nombre,
    cantidad: cant,
    precio_base: rawBase,
    precio_modificadores: rawMods,
    precio_total_unitario: rawTotal,
    precio_unitario: rawTotal,
    precio: rawTotal,
    precio_original: raw.precio_original !== undefined ? Number(raw.precio_original) : undefined,
    descuento: raw.descuento !== undefined ? Number(raw.descuento) : undefined,
    imagen_url: raw.imagen_url || undefined,
    variante_id: varId,
    nombre_variante: varNombre,
    variante: varId ? { id: String(varId), nombre: varNombre || '', precio: varPrecio } : undefined,
    nota: raw.nota || null,
    modificadores: mods,
  };
}

