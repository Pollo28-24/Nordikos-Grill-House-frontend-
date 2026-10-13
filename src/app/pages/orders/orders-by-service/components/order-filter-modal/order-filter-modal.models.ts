import { OrderStatusFilterValue, PaymentStatusFilterValue } from '../order-status-filter/order-status-filter';

export type DateFilterType = 'today' | 'week' | 'month' | 'custom';

export interface FilterChipOption<T> {
  value: T;
  label: string;
  icon: string;
}

export interface PeriodOption {
  value: DateFilterType;
  label: string;
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: '7 días' },
  { value: 'month', label: '30 días' },
  { value: 'custom', label: 'Rango' }
];

export const ORDER_STATUS_CHIPS: FilterChipOption<OrderStatusFilterValue>[] = [
  { value: 'pendiente', label: 'Pendientes', icon: 'clock' },
  { value: 'confirmado', label: 'Confirmadas', icon: 'check-circle' },
  { value: 'entregado', label: 'Entregadas', icon: 'check-circle2' },
  { value: 'cancelado', label: 'Canceladas', icon: 'ban' },
];

export const PAYMENT_STATUS_CHIPS: FilterChipOption<PaymentStatusFilterValue>[] = [
  { value: 'all', label: 'Todos', icon: 'layers' },
  { value: 'pendiente', label: 'Sin pagar', icon: 'alert-circle' },
  { value: 'pagado', label: 'Pagadas', icon: 'check-circle2' },
];
