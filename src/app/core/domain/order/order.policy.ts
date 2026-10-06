import { OrderItemSnapshot, OrderSnapshot, UserRole } from './order.types';

export class OrderPolicy {
  /**
   * Determina si se pueden agregar, incrementar o decrementar líneas en la orden.
   * Regla de negocio: Permitido en estados 'pendiente' y 'confirmado' mientras el pago
   * esté pendiente. Si ya fue pagado, únicamente supervisor o administrador pueden modificar.
   */
  static canModifyItems(order: OrderSnapshot, role: UserRole = 'mesero'): boolean {
    if (order.estado_pedido === 'cancelado' || order.estado_pedido === 'entregado') {
      return false;
    }

    if (order.estado_pago === 'pagado') {
      return role === 'supervisor' || role === 'administrador';
    }

    return order.estado_pedido === 'pendiente' || order.estado_pedido === 'confirmado';
  }

  /**
   * Determina si se puede alternar el tipo de servicio (Mesa / Llevar / Domicilio).
   */
  static canChangeServiceType(order: OrderSnapshot, _role: UserRole = 'mesero'): boolean {
    if (order.estado_pedido === 'cancelado' || order.estado_pedido === 'entregado') {
      return false;
    }
    return true;
  }

  /**
   * Determina si la orden completa puede ser cancelada.
   * Regla de negocio: Permitido en cualquier estado mientras no esté ya cancelada
   * (incluyendo órdenes completadas/entregadas y con pago registrado).
   */
  static canCancelOrder(order: OrderSnapshot, _role: UserRole = 'mesero'): boolean {
    if (order.estado_pedido === 'cancelado') {
      return false;
    }

    return true;
  }

  /**
   * Determina si un ítem específico de la orden puede ser decrementado o cancelado.
   */
  static canAdjustItem(order: OrderSnapshot, item: OrderItemSnapshot, role: UserRole = 'mesero'): boolean {
    if (item.estado === 'cancelado') {
      return false;
    }
    return this.canModifyItems(order, role);
  }

  /**
   * Determina si se puede registrar el pago de la comanda.
   */
  static canRegisterPayment(order: OrderSnapshot, _role: UserRole = 'cajero'): boolean {
    if (order.estado_pedido === 'cancelado') {
      return false;
    }
    return order.estado_pago !== 'pagado';
  }
}
