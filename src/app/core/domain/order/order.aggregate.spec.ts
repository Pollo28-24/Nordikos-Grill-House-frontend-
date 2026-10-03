import { OrderAggregate } from './order.aggregate';
import { OrderSnapshot, OrderItemSnapshot, AdjustItemQuantityCommand, CancelItemCommand, ChangeServiceTypeCommand, ChangeOrderStatusCommand, RegisterPaymentCommand } from './order.types';

describe('OrderAggregate (Pure Functional Domain Root)', () => {
  const mockInitialSnapshot: OrderSnapshot = {
    id: 101,
    numero_orden: 42,
    version: 1,
    cliente_id: 10,
    cliente_nombre: 'Martín Palermo',
    metodo_pago_id: 1,
    tipo_servicio_id: 1,
    tipo_servicio_codigo: 'comedor',
    numero_mesa: '5',
    direccion_entrega: null,
    turno_id: 2,
    estado_pedido: 'confirmado',
    estado_pago: 'pendiente',
    items: [
      {
        id: 1001,
        producto_id: 50,
        nombre_producto: 'Hamburguesa Vikinga',
        cantidad: 3,
        precio_unitario: 120,
        total: 360,
        estado: 'activo',
        modificadores: [],
      },
      {
        id: 1002,
        producto_id: 51,
        nombre_producto: 'Papas Rústicas',
        cantidad: 1,
        precio_unitario: 60,
        total: 60,
        estado: 'activo',
        modificadores: [],
      },
    ],
    subtotal: 420,
    propina: 30,
    total: 450,
    fecha_creacion: '2026-09-30T12:00:00Z',
  };

  it('debe instanciar el aggregate y recalcular totales correctamente', () => {
    const aggregate = OrderAggregate.create(mockInitialSnapshot);
    expect(aggregate.id).toBe(101);
    expect(aggregate.version).toBe(1);
    expect(aggregate.subtotal).toBe(420);
    expect(aggregate.propina).toBe(30);
    expect(aggregate.total).toBe(450);
  });

  describe('ADJUST_ITEM_QUANTITY (Delta & Absolute)', () => {
    it('debe incrementar la cantidad con delta +1 e incrementar versión', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: AdjustItemQuantityCommand = {
        type: 'ADJUST_ITEM_QUANTITY',
        commandId: 'cmd-1',
        orderId: 101,
        itemId: 1001,
        delta: 1,
        reason: 'courtesy_modification',
      };

      const { aggregate: next, events, result } = aggregate.execute(cmd);

      expect(result.success).toBe(true);
      expect(next.version).toBe(2);
      expect(aggregate.version).toBe(1); // Inmutabilidad garantizada
      
      const item = next.items.find((i: OrderItemSnapshot) => i.id === 1001);
      expect(item?.cantidad).toBe(4);
      expect(item?.total).toBe(480);
      expect(next.subtotal).toBe(540); // 480 + 60
      expect(next.total).toBe(570); // 540 + 30 propina
      expect(events.length).toBe(1);
      expect(events[0].name).toBe('OrderItemQuantityAdjusted');
    });

    it('debe decrementar la cantidad con delta -1', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: AdjustItemQuantityCommand = {
        type: 'ADJUST_ITEM_QUANTITY',
        commandId: 'cmd-2',
        orderId: 101,
        itemId: 1001,
        delta: -1,
        reason: 'customer_removed',
      };

      const { aggregate: next, result } = aggregate.execute(cmd);

      expect(result.success).toBe(true);
      const item = next.items.find((i: OrderItemSnapshot) => i.id === 1001);
      expect(item?.cantidad).toBe(2);
      expect(item?.total).toBe(240);
      expect(next.total).toBe(330); // 240 + 60 + 30
    });

    it('debe transicionar el ítem a cancelado cuando la cantidad llega a 0', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: AdjustItemQuantityCommand = {
        type: 'ADJUST_ITEM_QUANTITY',
        commandId: 'cmd-3',
        orderId: 101,
        itemId: 1002, // cantidad 1
        delta: -1,
        reason: 'waiter_error',
      };

      const { aggregate: next, events, result } = aggregate.execute(cmd);

      expect(result.success).toBe(true);
      const item = next.items.find((i: OrderItemSnapshot) => i.id === 1002);
      expect(item?.cantidad).toBe(0);
      expect(item?.estado).toBe('cancelado');
      expect(item?.motivo_ajuste).toBe('waiter_error');
      expect(next.subtotal).toBe(360); // solo ítem 1001
      expect(next.total).toBe(390); // 360 + 30
      expect(events[0].name).toBe('OrderItemCancelled');
    });

    it('debe rechazar cantidades negativas', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: AdjustItemQuantityCommand = {
        type: 'ADJUST_ITEM_QUANTITY',
        commandId: 'cmd-4',
        orderId: 101,
        itemId: 1002,
        delta: -5,
        reason: 'customer_removed',
      };

      const { aggregate: next, result } = aggregate.execute(cmd);

      expect(result.success).toBe(false);
      expect(result.error).toContain('negativa');
      expect(next).toBe(aggregate); // No muta
    });

    it('debe rechazar ajustes si la orden ya está pagada', () => {
      const paidSnapshot: OrderSnapshot = {
        ...mockInitialSnapshot,
        estado_pago: 'pagado',
      };
      const aggregate = OrderAggregate.create(paidSnapshot);
      const cmd: AdjustItemQuantityCommand = {
        type: 'ADJUST_ITEM_QUANTITY',
        commandId: 'cmd-5',
        orderId: 101,
        itemId: 1001,
        delta: 1,
        reason: 'customer_removed',
      };

      const { result } = aggregate.execute(cmd);
      expect(result.success).toBe(false);
      expect(result.error).toContain('pagada');
    });
  });

  describe('CANCEL_ITEM', () => {
    it('debe anular la línea completa y actualizar totales', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: CancelItemCommand = {
        type: 'CANCEL_ITEM',
        commandId: 'cmd-cancel-1',
        orderId: 101,
        itemId: 1001,
        reason: 'kitchen_reject',
        reasonNotes: 'Se agotó la carne angus',
      };

      const { aggregate: next, events, result } = aggregate.execute(cmd);

      expect(result.success).toBe(true);
      const item = next.items.find((i: OrderItemSnapshot) => i.id === 1001);
      expect(item?.estado).toBe('cancelado');
      expect(item?.cantidad).toBe(0);
      expect(item?.motivo_ajuste).toBe('kitchen_reject');
      expect(next.total).toBe(90); // solo papas (60) + propina (30)
      expect(events[0].name).toBe('OrderItemCancelled');
    });
  });

  describe('CHANGE_SERVICE_TYPE', () => {
    it('debe permitir cambiar de Comedor a Para Llevar purgando la mesa', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: ChangeServiceTypeCommand = {
        type: 'CHANGE_SERVICE_TYPE',
        commandId: 'cmd-serv-1',
        orderId: 101,
        newServiceTypeId: 2,
        newServiceCode: 'llevar',
        newServiceName: 'Para Llevar',
      };

      const { aggregate: next, result, events } = aggregate.execute(cmd);

      expect(result.success).toBe(true);
      expect(next.tipo_servicio_codigo).toBe('llevar');
      expect(next.numero_mesa).toBeNull();
      expect(events[0].name).toBe('OrderServiceTypeChanged');
    });

    it('debe exigir número de mesa al cambiar a Comedor', () => {
      const llevarSnapshot: OrderSnapshot = {
        ...mockInitialSnapshot,
        tipo_servicio_codigo: 'llevar',
        numero_mesa: null,
      };
      const aggregate = OrderAggregate.create(llevarSnapshot);
      const cmd: ChangeServiceTypeCommand = {
        type: 'CHANGE_SERVICE_TYPE',
        commandId: 'cmd-serv-2',
        orderId: 101,
        newServiceTypeId: 1,
        newServiceCode: 'comedor',
        numero_mesa: '', // Vacío
      };

      const { result } = aggregate.execute(cmd);
      expect(result.success).toBe(false);
      expect(result.error).toContain('número de mesa');
    });

    it('debe exigir dirección al cambiar a Domicilio', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: ChangeServiceTypeCommand = {
        type: 'CHANGE_SERVICE_TYPE',
        commandId: 'cmd-serv-3',
        orderId: 101,
        newServiceTypeId: 3,
        newServiceCode: 'domicilio',
        direccion_entrega: '   ', // Vacío
      };

      const { result } = aggregate.execute(cmd);
      expect(result.success).toBe(false);
      expect(result.error).toContain('dirección');
    });
  });

  describe('CHANGE_ORDER_STATUS', () => {
    it('debe transicionar de confirmado a entregado registrando fecha de cierre', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: ChangeOrderStatusCommand = {
        type: 'CHANGE_ORDER_STATUS',
        commandId: 'cmd-status-1',
        orderId: 101,
        newStatus: 'entregado',
      };

      const { aggregate: next, result, events } = aggregate.execute(cmd);
      expect(result.success).toBe(true);
      expect(next.estado_pedido).toBe('entregado');
      expect(next.getSnapshot().fecha_cierre).toBeTruthy();
      expect(events[0].name).toBe('OrderStatusChanged');
    });

    it('debe exigir motivo justificado al cancelar una orden', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: ChangeOrderStatusCommand = {
        type: 'CHANGE_ORDER_STATUS',
        commandId: 'cmd-status-2',
        orderId: 101,
        newStatus: 'cancelado',
        reason: '   ', // Vacío
      };

      const { result } = aggregate.execute(cmd);
      expect(result.success).toBe(false);
      expect(result.error).toContain('motivo');
    });
  });

  describe('REGISTER_PAYMENT', () => {
    it('debe registrar el pago cuando el monto es suficiente', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: RegisterPaymentCommand = {
        type: 'REGISTER_PAYMENT',
        commandId: 'cmd-pay-1',
        orderId: 101,
        paymentMethodId: 2,
        paymentMethodName: 'Tarjeta Débito',
        amountPaid: 450,
      };

      const { aggregate: next, result, events } = aggregate.execute(cmd);
      expect(result.success).toBe(true);
      expect(next.estado_pago).toBe('pagado');
      expect(events[0].name).toBe('OrderPaymentRegistered');
    });

    it('debe rechazar pagos insuficientes', () => {
      const aggregate = OrderAggregate.create(mockInitialSnapshot);
      const cmd: RegisterPaymentCommand = {
        type: 'REGISTER_PAYMENT',
        commandId: 'cmd-pay-2',
        orderId: 101,
        paymentMethodId: 1,
        amountPaid: 400, // Menor a 450
      };

      const { result } = aggregate.execute(cmd);
      expect(result.success).toBe(false);
      expect(result.error).toContain('inferior');
    });
  });
});
