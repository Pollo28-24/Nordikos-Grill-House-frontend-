import {
  AdjustItemQuantityCommand,
  AuditLogEntry,
  CancelItemCommand,
  ChangeOrderStatusCommand,
  ChangeServiceTypeCommand,
  ExecutionResult,
  OrderCommand,
  OrderItemSnapshot,
  OrderSnapshot,
  RegisterPaymentCommand,
} from './order.types';
import {
  OrderItemQuantityAdjustedEvent,
  OrderItemCancelledEvent,
  OrderServiceTypeChangedEvent,
  OrderStatusChangedEvent,
  OrderPaymentRegisteredEvent,
  OrderDomainEvent,
} from './order.events';
import {
  canTransitionOrderStatus,
  canTransitionServiceType,
  validateServiceTypePrerequisites,
} from './order.state-machine';
import { OrderPolicy } from './order.policy';

export class OrderAggregate {
  private constructor(private readonly snapshot: OrderSnapshot) {}

  public static create(snapshot: OrderSnapshot): OrderAggregate {
    // Garantiza que los totales sean coherentes desde la instanciación
    const recalculated = OrderAggregate.recalculateTotals(snapshot);
    return new OrderAggregate(recalculated);
  }

  public getSnapshot(): OrderSnapshot {
    return { ...this.snapshot };
  }

  public get id(): number {
    return this.snapshot.id;
  }

  public get version(): number {
    return this.snapshot.version;
  }

  public get total(): number {
    return this.snapshot.total;
  }

  public get subtotal(): number {
    return this.snapshot.subtotal;
  }

  public get propina(): number {
    return this.snapshot.propina;
  }

  public get estado_pedido() {
    return this.snapshot.estado_pedido;
  }

  public get estado_pago() {
    return this.snapshot.estado_pago;
  }

  public get items(): readonly OrderItemSnapshot[] {
    return this.snapshot.items;
  }

  public get tipo_servicio_codigo() {
    return this.snapshot.tipo_servicio_codigo;
  }

  public get numero_mesa() {
    return this.snapshot.numero_mesa;
  }

  public get direccion_entrega() {
    return this.snapshot.direccion_entrega;
  }

  /**
   * Punto de entrada formal e inmutable para ejecutar cualquier comando de dominio.
   */
  public execute<T = unknown>(command: OrderCommand): ExecutionResult<T> {
    switch (command.type) {
      case 'ADJUST_ITEM_QUANTITY':
        return this.handleAdjustItemQuantity(command) as unknown as ExecutionResult<T>;
      case 'CANCEL_ITEM':
        return this.handleCancelItem(command) as unknown as ExecutionResult<T>;
      case 'CHANGE_SERVICE_TYPE':
        return this.handleChangeServiceType(command) as unknown as ExecutionResult<T>;
      case 'CHANGE_ORDER_STATUS':
        return this.handleChangeOrderStatus(command) as unknown as ExecutionResult<T>;
      case 'REGISTER_PAYMENT':
        return this.handleRegisterPayment(command) as unknown as ExecutionResult<T>;
      default:
        throw new Error(`Comando no soportado: ${(command as any).type}`);
    }
  }

  // ------------------------------------------------------------------------
  // Handlers Privados de Comandos
  // ------------------------------------------------------------------------

  private handleAdjustItemQuantity(
    cmd: AdjustItemQuantityCommand
  ): ExecutionResult<{ newQuantity: number; newTotal: number }> {
    if (!OrderPolicy.canModifyItems(this.snapshot)) {
      return this.failureResult(
        cmd.commandId,
        `No se puede modificar la orden en estado "${this.snapshot.estado_pedido}" o cuando ya está pagada.`
      );
    }

    const itemIndex = this.snapshot.items.findIndex((i) => i.id === cmd.itemId);
    if (itemIndex === -1) {
      return this.failureResult(cmd.commandId, `El producto con ID ${cmd.itemId} no existe en la orden.`);
    }

    const currentItem = this.snapshot.items[itemIndex];
    if (currentItem.estado === 'cancelado') {
      return this.failureResult(cmd.commandId, 'No se puede ajustar un producto que ya ha sido cancelado.');
    }

    let targetQty: number;
    if (cmd.delta !== undefined) {
      targetQty = currentItem.cantidad + cmd.delta;
    } else if (cmd.targetQuantity !== undefined) {
      targetQty = cmd.targetQuantity;
    } else {
      return this.failureResult(cmd.commandId, 'Debe especificarse delta o targetQuantity.');
    }

    if (targetQty < 0) {
      return this.failureResult(cmd.commandId, 'La cantidad de un producto no puede ser negativa.');
    }

    const events: OrderDomainEvent[] = [];
    const updatedItems = [...this.snapshot.items];

    if (targetQty === 0) {
      // Regla de negocio: si la cantidad llega a 0, la línea transiciona a 'cancelado'
      const cancelledItem: OrderItemSnapshot = {
        ...currentItem,
        cantidad: 0,
        total: 0,
        estado: 'cancelado',
        motivo_ajuste: cmd.reason,
      };
      updatedItems[itemIndex] = cancelledItem;

      const cancelEvent: OrderItemCancelledEvent = {
        id: crypto.randomUUID(),
        name: 'OrderItemCancelled',
        orderId: this.snapshot.id,
        itemId: currentItem.id,
        previousQuantity: currentItem.cantidad,
        reason: cmd.reason,
        reasonNotes: cmd.reasonNotes,
        timestamp: new Date().toISOString(),
      };
      events.push(cancelEvent);
    } else {
      const lineTotal = targetQty * currentItem.precio_unitario;
      const modifiedItem: OrderItemSnapshot = {
        ...currentItem,
        cantidad: targetQty,
        total: lineTotal,
        motivo_ajuste: cmd.reason,
      };
      updatedItems[itemIndex] = modifiedItem;

      const adjustEvent: OrderItemQuantityAdjustedEvent = {
        id: crypto.randomUUID(),
        name: 'OrderItemQuantityAdjusted',
        orderId: this.snapshot.id,
        itemId: currentItem.id,
        previousQuantity: currentItem.cantidad,
        newQuantity: targetQty,
        unitPrice: currentItem.precio_unitario,
        newTotal: lineTotal,
        reason: cmd.reason,
        reasonNotes: cmd.reasonNotes,
        timestamp: new Date().toISOString(),
      };
      events.push(adjustEvent);
    }

    const newSnapshotDraft: OrderSnapshot = {
      ...this.snapshot,
      version: this.snapshot.version + 1,
      items: updatedItems,
    };
    const finalSnapshot = OrderAggregate.recalculateTotals(newSnapshotDraft);
    const newAggregate = new OrderAggregate(finalSnapshot);

    const audit: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      orderId: this.snapshot.id,
      commandId: cmd.commandId,
      action: targetQty === 0 ? 'ITEM_CANCELLED_VIA_STEPPER' : 'ITEM_QUANTITY_ADJUSTED',
      details: {
        itemId: cmd.itemId,
        previousQty: currentItem.cantidad,
        newQty: targetQty,
        reason: cmd.reason,
        reasonNotes: cmd.reasonNotes,
        newOrderTotal: finalSnapshot.total,
      },
    };

    return {
      aggregate: newAggregate,
      events,
      audit,
      result: {
        success: true,
        commandId: cmd.commandId,
        version: finalSnapshot.version,
        data: { newQuantity: targetQty, newTotal: finalSnapshot.total },
      },
    };
  }

  private handleCancelItem(
    cmd: CancelItemCommand
  ): ExecutionResult<{ cancelledItemId: number; newTotal: number }> {
    const itemIndex = this.snapshot.items.findIndex((i) => i.id === cmd.itemId);
    if (itemIndex === -1) {
      return this.failureResult(cmd.commandId, `El producto con ID ${cmd.itemId} no existe en la orden.`);
    }

    const currentItem = this.snapshot.items[itemIndex];
    if (!OrderPolicy.canAdjustItem(this.snapshot, currentItem)) {
      return this.failureResult(
        cmd.commandId,
        `No se puede anular el producto en el estado actual de la orden o ítem ya cancelado.`
      );
    }

    const updatedItems = [...this.snapshot.items];
    const cancelledItem: OrderItemSnapshot = {
      ...currentItem,
      cantidad: 0,
      total: 0,
      estado: 'cancelado',
      motivo_ajuste: cmd.reason,
    };
    updatedItems[itemIndex] = cancelledItem;

    const newSnapshotDraft: OrderSnapshot = {
      ...this.snapshot,
      version: this.snapshot.version + 1,
      items: updatedItems,
    };
    const finalSnapshot = OrderAggregate.recalculateTotals(newSnapshotDraft);
    const newAggregate = new OrderAggregate(finalSnapshot);

    const event: OrderItemCancelledEvent = {
      id: crypto.randomUUID(),
      name: 'OrderItemCancelled',
      orderId: this.snapshot.id,
      itemId: currentItem.id,
      previousQuantity: currentItem.cantidad,
      reason: cmd.reason,
      reasonNotes: cmd.reasonNotes,
      timestamp: new Date().toISOString(),
    };

    const audit: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      orderId: this.snapshot.id,
      commandId: cmd.commandId,
      action: 'ITEM_CANCELLED',
      details: {
        itemId: cmd.itemId,
        nombre: currentItem.nombre_producto,
        reason: cmd.reason,
        reasonNotes: cmd.reasonNotes,
        previousQuantity: currentItem.cantidad,
        newOrderTotal: finalSnapshot.total,
      },
    };

    return {
      aggregate: newAggregate,
      events: [event],
      audit,
      result: {
        success: true,
        commandId: cmd.commandId,
        version: finalSnapshot.version,
        data: { cancelledItemId: cmd.itemId, newTotal: finalSnapshot.total },
      },
    };
  }

  private handleChangeServiceType(
    cmd: ChangeServiceTypeCommand
  ): ExecutionResult<{ newServiceType: string }> {
    if (!OrderPolicy.canChangeServiceType(this.snapshot)) {
      return this.failureResult(cmd.commandId, 'No se permite cambiar el servicio en el estado actual.');
    }

    if (
      !canTransitionServiceType(
        this.snapshot.estado_pedido,
        this.snapshot.tipo_servicio_codigo,
        cmd.newServiceCode
      )
    ) {
      return this.failureResult(
        cmd.commandId,
        `Transición de servicio no permitida de "${this.snapshot.tipo_servicio_codigo}" a "${cmd.newServiceCode}".`
      );
    }

    const prereqCheck = validateServiceTypePrerequisites(
      cmd.newServiceCode,
      cmd.numero_mesa,
      cmd.direccion_entrega
    );
    if (!prereqCheck.valid) {
      return this.failureResult(cmd.commandId, prereqCheck.error || 'Prerrequisitos de servicio inválidos.');
    }

    const finalMesa = cmd.newServiceCode === 'comedor' ? (cmd.numero_mesa?.trim() ?? null) : null;
    const finalDir = cmd.newServiceCode === 'domicilio' ? (cmd.direccion_entrega?.trim() ?? null) : null;

    const updatedSnapshot: OrderSnapshot = {
      ...this.snapshot,
      version: this.snapshot.version + 1,
      tipo_servicio_id: cmd.newServiceTypeId,
      tipo_servicio_codigo: cmd.newServiceCode,
      tipo_servicio_nombre: cmd.newServiceName ?? this.snapshot.tipo_servicio_nombre,
      numero_mesa: finalMesa,
      direccion_entrega: finalDir,
    };
    const newAggregate = new OrderAggregate(updatedSnapshot);

    const event: OrderServiceTypeChangedEvent = {
      id: crypto.randomUUID(),
      name: 'OrderServiceTypeChanged',
      orderId: this.snapshot.id,
      previousType: this.snapshot.tipo_servicio_codigo,
      newType: cmd.newServiceCode,
      newServiceTypeId: cmd.newServiceTypeId,
      numero_mesa: finalMesa,
      direccion_entrega: finalDir,
      timestamp: new Date().toISOString(),
    };

    const audit: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      orderId: this.snapshot.id,
      commandId: cmd.commandId,
      action: 'SERVICE_TYPE_CHANGED',
      details: {
        from: this.snapshot.tipo_servicio_codigo,
        to: cmd.newServiceCode,
        numero_mesa: finalMesa,
        direccion_entrega: finalDir,
      },
    };

    return {
      aggregate: newAggregate,
      events: [event],
      audit,
      result: {
        success: true,
        commandId: cmd.commandId,
        version: updatedSnapshot.version,
        data: { newServiceType: cmd.newServiceCode },
      },
    };
  }

  private handleChangeOrderStatus(
    cmd: ChangeOrderStatusCommand
  ): ExecutionResult<{ newStatus: string }> {
    if (!canTransitionOrderStatus(this.snapshot.estado_pedido, cmd.newStatus)) {
      return this.failureResult(
        cmd.commandId,
        `Transición no permitida de "${this.snapshot.estado_pedido}" a "${cmd.newStatus}".`
      );
    }

    if (cmd.newStatus === 'cancelado' && !cmd.reason?.trim()) {
      return this.failureResult(cmd.commandId, 'Cancelar una orden requiere obligatoriamente un motivo justificado.');
    }

    const isClosing = cmd.newStatus === 'entregado' || cmd.newStatus === 'cancelado';
    const closeDate = isClosing ? new Date().toISOString() : this.snapshot.fecha_cierre;

    const updatedSnapshot: OrderSnapshot = {
      ...this.snapshot,
      version: this.snapshot.version + 1,
      estado_pedido: cmd.newStatus,
      motivo_cancelacion: cmd.newStatus === 'cancelado' ? cmd.reason?.trim() : this.snapshot.motivo_cancelacion,
      fecha_cierre: closeDate,
    };
    const newAggregate = new OrderAggregate(updatedSnapshot);

    const event: OrderStatusChangedEvent = {
      id: crypto.randomUUID(),
      name: 'OrderStatusChanged',
      orderId: this.snapshot.id,
      previousStatus: this.snapshot.estado_pedido,
      newStatus: cmd.newStatus,
      reason: cmd.reason,
      timestamp: new Date().toISOString(),
    };

    const audit: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      orderId: this.snapshot.id,
      commandId: cmd.commandId,
      action: 'ORDER_STATUS_CHANGED',
      details: {
        from: this.snapshot.estado_pedido,
        to: cmd.newStatus,
        reason: cmd.reason,
      },
    };

    return {
      aggregate: newAggregate,
      events: [event],
      audit,
      result: {
        success: true,
        commandId: cmd.commandId,
        version: updatedSnapshot.version,
        data: { newStatus: cmd.newStatus },
      },
    };
  }

  private handleRegisterPayment(
    cmd: RegisterPaymentCommand
  ): ExecutionResult<{ totalPaid: number }> {
    if (!OrderPolicy.canRegisterPayment(this.snapshot)) {
      return this.failureResult(
        cmd.commandId,
        `No se puede registrar pago para una orden en estado "${this.snapshot.estado_pedido}" o que ya fue pagada.`
      );
    }

    const newPropina = cmd.propina !== undefined ? Math.max(0, cmd.propina) : this.snapshot.propina;
    const finalSnapshotDraft: OrderSnapshot = {
      ...this.snapshot,
      propina: newPropina,
    };
    const finalRecalculated = OrderAggregate.recalculateTotals(finalSnapshotDraft);

    if (cmd.amountPaid < finalRecalculated.total) {
      return this.failureResult(
        cmd.commandId,
        `El monto pagado ($${cmd.amountPaid}) es inferior al total requerido ($${finalRecalculated.total}).`
      );
    }

    const updatedSnapshot: OrderSnapshot = {
      ...finalRecalculated,
      version: this.snapshot.version + 1,
      estado_pago: 'pagado',
      metodo_pago_id: cmd.paymentMethodId,
      metodo_pago_nombre: cmd.paymentMethodName ?? this.snapshot.metodo_pago_nombre,
    };
    const newAggregate = new OrderAggregate(updatedSnapshot);

    const event: OrderPaymentRegisteredEvent = {
      id: crypto.randomUUID(),
      name: 'OrderPaymentRegistered',
      orderId: this.snapshot.id,
      paymentMethodId: cmd.paymentMethodId,
      amountPaid: cmd.amountPaid,
      propina: newPropina,
      totalOrder: updatedSnapshot.total,
      timestamp: new Date().toISOString(),
    };

    const audit: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      orderId: this.snapshot.id,
      commandId: cmd.commandId,
      action: 'PAYMENT_REGISTERED',
      details: {
        paymentMethodId: cmd.paymentMethodId,
        amountPaid: cmd.amountPaid,
        propina: newPropina,
        total: updatedSnapshot.total,
      },
    };

    return {
      aggregate: newAggregate,
      events: [event],
      audit,
      result: {
        success: true,
        commandId: cmd.commandId,
        version: updatedSnapshot.version,
        data: { totalPaid: cmd.amountPaid },
      },
    };
  }

  // ------------------------------------------------------------------------
  // Métodos Auxiliares Puros
  // ------------------------------------------------------------------------

  private static recalculateTotals(snapshot: OrderSnapshot): OrderSnapshot {
    const activeSubtotal = (snapshot.items || [])
      .filter((item) => item.estado !== 'cancelado')
      .reduce((sum, item) => sum + Number(item.total || 0), 0);

    const propina = Number(snapshot.propina || 0);
    const total = activeSubtotal + propina;

    return {
      ...snapshot,
      subtotal: Number(activeSubtotal.toFixed(2)),
      propina: Number(propina.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }

  private failureResult(commandId: string, error: string): ExecutionResult<any> {
    return {
      aggregate: this,
      events: [],
      audit: {
        timestamp: new Date().toISOString(),
        orderId: this.snapshot.id,
        commandId,
        action: 'COMMAND_REJECTED',
        details: { error },
      },
      result: {
        success: false,
        commandId,
        version: this.snapshot.version,
        error,
      },
    };
  }
}
