import type { OrderStatus, PaymentStatus } from '@core/models/order.model';
import type { OrderAggregate } from './order.aggregate';
import type { OrderDomainEvent } from './order.events';

export type { OrderStatus, PaymentStatus };

export type ServiceTypeCode = 'comedor' | 'llevar' | 'domicilio';

export type ItemAdjustmentReason =
  | 'customer_removed'     // El cliente cambió de opinión
  | 'kitchen_reject'       // Cocina no cuenta con insumos
  | 'waiter_error'         // Error de captura del mesero
  | 'courtesy_modification' // Cortesía o reemplazo comercial
  | 'other';               // Otra razón (requiere detalle)

export type UserRole = 'mesero' | 'cajero' | 'supervisor' | 'administrador';

export type SyncStatus =
  | 'LOCAL'     // Mutación aplicada optimísticamente en memoria local
  | 'QUEUED'    // En cola persistente offline (IndexedDB)
  | 'SYNCING'   // En tránsito HTTP / WebSocket hacia Supabase
  | 'SYNCED'    // Persistido y confirmado por PostgreSQL
  | 'FAILED'    // Error de red no fatal
  | 'RETRYING'  // Reintentando con retroceso exponencial
  | 'CONFLICT'; // Colisión 409 / Concurrencia (requiere re-fetch y merge)

export interface OrderItemModifierSnapshot {
  readonly id: number;
  readonly nombre_modificador: string;
  readonly cantidad: number;
  readonly precio_unitario: number;
}

export interface OrderItemSnapshot {
  readonly id: number;
  readonly producto_id: number;
  readonly nombre_producto: string;
  readonly cantidad: number;
  readonly precio_unitario: number;
  readonly total: number;
  readonly nota?: string | null;
  readonly estado: 'activo' | 'cancelado';
  readonly motivo_ajuste?: string | null;
  readonly modificadores: readonly OrderItemModifierSnapshot[];
  readonly syncStatus?: SyncStatus;
}

export interface OrderSnapshot {
  readonly id: number;
  readonly numero_orden?: number;
  readonly version: number;
  readonly cliente_id: number | null;
  readonly cliente_nombre?: string;
  readonly cliente_telefono?: string;
  readonly metodo_pago_id: number;
  readonly metodo_pago_nombre?: string;
  readonly tipo_servicio_id: number;
  readonly tipo_servicio_codigo: ServiceTypeCode;
  readonly tipo_servicio_nombre?: string;
  readonly numero_mesa?: string | null;
  readonly direccion_entrega?: string | null;
  readonly turno_id: number | null;
  readonly estado_pedido: OrderStatus;
  readonly estado_pago: PaymentStatus;
  readonly items: readonly OrderItemSnapshot[];
  readonly subtotal: number;
  readonly propina: number;
  readonly total: number;
  readonly nota_general?: string | null;
  readonly motivo_cancelacion?: string | null;
  readonly fecha_creacion: string;
  readonly fecha_cierre?: string | null;
  readonly client_request_id?: string;
}

export interface AuditLogEntry {
  readonly timestamp: string;
  readonly orderId: number;
  readonly commandId: string;
  readonly action: string;
  readonly userId?: string | number;
  readonly details: Record<string, unknown>;
}

// -------------------------------------------------------------
// Contratos de Comandos
// -------------------------------------------------------------

export interface BaseOrderCommand {
  readonly commandId: string;
  readonly orderId: number;
  readonly timestamp?: string;
}

export interface AdjustItemQuantityCommand extends BaseOrderCommand {
  readonly type: 'ADJUST_ITEM_QUANTITY';
  readonly itemId: number;
  readonly delta?: number;
  readonly targetQuantity?: number;
  readonly reason: ItemAdjustmentReason;
  readonly reasonNotes?: string;
}

export interface CancelItemCommand extends BaseOrderCommand {
  readonly type: 'CANCEL_ITEM';
  readonly itemId: number;
  readonly reason: ItemAdjustmentReason;
  readonly reasonNotes?: string;
}

export interface ChangeServiceTypeCommand extends BaseOrderCommand {
  readonly type: 'CHANGE_SERVICE_TYPE';
  readonly newServiceTypeId: number;
  readonly newServiceCode: ServiceTypeCode;
  readonly newServiceName?: string;
  readonly numero_mesa?: string | null;
  readonly direccion_entrega?: string | null;
}

export interface ChangeOrderStatusCommand extends BaseOrderCommand {
  readonly type: 'CHANGE_ORDER_STATUS';
  readonly newStatus: OrderStatus;
  readonly reason?: string;
}

export interface RegisterPaymentCommand extends BaseOrderCommand {
  readonly type: 'REGISTER_PAYMENT';
  readonly paymentMethodId: number;
  readonly paymentMethodName?: string;
  readonly amountPaid: number;
  readonly propina?: number;
}

export type OrderCommand =
  | AdjustItemQuantityCommand
  | CancelItemCommand
  | ChangeServiceTypeCommand
  | ChangeOrderStatusCommand
  | RegisterPaymentCommand;

// -------------------------------------------------------------
// Resultados de Ejecución
// -------------------------------------------------------------

export interface CommandResult<T = unknown> {
  readonly success: boolean;
  readonly commandId: string;
  readonly version: number;
  readonly data?: T;
  readonly warnings?: readonly string[];
  readonly error?: string;
}

export interface ExecutionResult<T = unknown> {
  readonly aggregate: OrderAggregate;
  readonly events: readonly OrderDomainEvent[];
  readonly audit: AuditLogEntry;
  readonly result: CommandResult<T>;
}
