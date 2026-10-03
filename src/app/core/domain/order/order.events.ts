import { ItemAdjustmentReason, OrderStatus, ServiceTypeCode } from './order.types';

export interface BaseDomainEvent {
  readonly id: string;
  readonly name: string;
  readonly orderId: number;
  readonly timestamp: string;
}

export interface OrderItemQuantityAdjustedEvent extends BaseDomainEvent {
  readonly name: 'OrderItemQuantityAdjusted';
  readonly itemId: number;
  readonly previousQuantity: number;
  readonly newQuantity: number;
  readonly unitPrice: number;
  readonly newTotal: number;
  readonly reason: ItemAdjustmentReason;
  readonly reasonNotes?: string;
}

export interface OrderItemCancelledEvent extends BaseDomainEvent {
  readonly name: 'OrderItemCancelled';
  readonly itemId: number;
  readonly previousQuantity: number;
  readonly reason: ItemAdjustmentReason;
  readonly reasonNotes?: string;
}

export interface OrderServiceTypeChangedEvent extends BaseDomainEvent {
  readonly name: 'OrderServiceTypeChanged';
  readonly previousType: ServiceTypeCode;
  readonly newType: ServiceTypeCode;
  readonly newServiceTypeId: number;
  readonly numero_mesa?: string | null;
  readonly direccion_entrega?: string | null;
}

export interface OrderStatusChangedEvent extends BaseDomainEvent {
  readonly name: 'OrderStatusChanged';
  readonly previousStatus: OrderStatus;
  readonly newStatus: OrderStatus;
  readonly reason?: string;
}

export interface OrderPaymentRegisteredEvent extends BaseDomainEvent {
  readonly name: 'OrderPaymentRegistered';
  readonly paymentMethodId: number;
  readonly amountPaid: number;
  readonly propina: number;
  readonly totalOrder: number;
}

export type OrderDomainEvent =
  | OrderItemQuantityAdjustedEvent
  | OrderItemCancelledEvent
  | OrderServiceTypeChangedEvent
  | OrderStatusChangedEvent
  | OrderPaymentRegisteredEvent;
