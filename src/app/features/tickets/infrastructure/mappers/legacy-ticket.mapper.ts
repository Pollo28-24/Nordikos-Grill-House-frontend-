import { PrintableOrder } from '../../domain/models/printable-order.model';
import { TicketData } from '../../models/ticket.model';

export class LegacyTicketMapper {
  static toTicketData(printable: PrintableOrder): TicketData {
    return {
      order: {
        id: printable.id,
        numero_orden: printable.numeroOrden,
        numero_mesa: printable.numeroMesa,
        fecha_creacion: printable.fechaCreacion,
        estado_pedido: printable.estadoPedido,
        estado_pago: printable.estadoPago,
        total: printable.total,
        propina: printable.propina,
        nota_general: printable.notaGeneral,
        cliente: printable.cliente ? {
          nombre: printable.cliente.nombre,
          telefono: printable.cliente.telefono
        } : undefined,
        tipo_servicio: printable.tipoServicio
      },
      items: printable.items.map(item => ({
        id: item.id,
        order_id: item.orderId,
        nombre_producto: item.nombreProducto,
        cantidad: item.cantidad,
        precio_unitario: item.precioUnitario,
        total: item.total,
        nota: item.nota,
        variante: item.variante,
        estado: item.estado,
        modificadores: item.modificadores.map(m => ({
          nombre_modificador: m.nombre,
          cantidad: m.cantidad,
          precio_unitario: m.precioUnitario
        }))
      }))
    };
  }

  static toPrintableOrder(data: TicketData): PrintableOrder {
    return {
      id: data.order.id,
      numeroOrden: data.order.numero_orden,
      numeroMesa: data.order.numero_mesa,
      fechaCreacion: data.order.fecha_creacion,
      estadoPedido: data.order.estado_pedido,
      estadoPago: data.order.estado_pago,
      total: data.order.total,
      propina: data.order.propina,
      notaGeneral: data.order.nota_general,
      cliente: data.order.cliente ? {
        nombre: data.order.cliente.nombre,
        telefono: data.order.cliente.telefono
      } : undefined,
      tipoServicio: data.order.tipo_servicio,
      items: (data.items || []).map(item => ({
        id: item.id,
        orderId: item.order_id,
        nombreProducto: item.nombre_producto,
        cantidad: item.cantidad,
        precioUnitario: item.precio_unitario,
        total: item.total,
        nota: item.nota,
        variante: item.variante,
        estado: item.estado,
        modificadores: (item.modificadores || []).map(m => ({
          nombre: m.nombre_modificador,
          cantidad: m.cantidad,
          precioUnitario: m.precio_unitario
        }))
      }))
    };
  }
}
