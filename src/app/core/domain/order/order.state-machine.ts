import { OrderStatus, ServiceTypeCode } from './order.types';

export const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pendiente: ['confirmado', 'cancelado'],
  confirmado: ['entregado', 'cancelado'],
  entregado: ['cancelado'], // Requiere autorización o supervisor
  cancelado: [],           // Estado terminal
};

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return false;
  const allowed = ORDER_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export const SERVICE_TYPE_TRANSITIONS: Readonly<Record<ServiceTypeCode, readonly ServiceTypeCode[]>> = {
  comedor: ['llevar', 'domicilio'],
  llevar: ['comedor', 'domicilio'],
  domicilio: ['comedor', 'llevar'],
};

export function canTransitionServiceType(
  orderStatus: OrderStatus,
  currentType: ServiceTypeCode,
  targetType: ServiceTypeCode
): boolean {
  if (currentType === targetType) return true;
  // No se permite cambiar el tipo de servicio si la orden ya fue entregada o cancelada
  if (orderStatus === 'entregado' || orderStatus === 'cancelado') {
    return false;
  }
  const allowed = SERVICE_TYPE_TRANSITIONS[currentType];
  return allowed ? allowed.includes(targetType) : false;
}

export interface ServiceTypeValidationResult {
  readonly valid: boolean;
  readonly error?: string;
}

export function validateServiceTypePrerequisites(
  targetType: ServiceTypeCode,
  numeroMesa?: string | null,
  direccionEntrega?: string | null
): ServiceTypeValidationResult {
  if (targetType === 'comedor') {
    const mesaClean = numeroMesa?.trim();
    if (!mesaClean) {
      return { valid: false, error: 'El servicio en Comedor requiere especificar el número de mesa.' };
    }
  }

  if (targetType === 'domicilio') {
    const dirClean = direccionEntrega?.trim();
    if (!dirClean) {
      return { valid: false, error: 'El servicio a Domicilio requiere especificar la dirección de entrega.' };
    }
  }

  return { valid: true };
}
