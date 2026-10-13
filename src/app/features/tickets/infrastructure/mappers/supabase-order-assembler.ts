import { PrintableOrder, PrintableItem } from '../../domain/models/printable-order.model';

export class SupabaseOrderAssembler {
  static toPrintableOrder(orderRaw: any, itemsRaw: any[]): PrintableOrder {
    const clienteRaw = Array.isArray(orderRaw?.clientes) ? orderRaw.clientes[0] : orderRaw?.clientes;
    const tipoServicioRaw = Array.isArray(orderRaw?.tipos_servicio)
      ? orderRaw.tipos_servicio[0]?.nombre
      : orderRaw?.tipos_servicio?.nombre;

    const items: PrintableItem[] = (itemsRaw || [])
      .filter(item => item.estado !== 'cancelado')
      .map(item => ({
        id: item.id,
        orderId: item.order_id,
        nombreProducto: item.nombre_producto,
        cantidad: Number(item.cantidad || 1),
        precioUnitario: Number(item.precio_unitario || 0),
        total: Number(item.total ?? (Number(item.cantidad || 1) * Number(item.precio_unitario || 0))),
        nota: item.nota,
        variante: item.variante,
        estado: item.estado,
        modificadores: (item.order_item_modificadores || []).map((m: any) => ({
          nombre: m.nombre_modificador,
          cantidad: Number(m.cantidad || 1),
          precioUnitario: Number(m.precio_unitario || 0)
        }))
      }));

    return {
      id: orderRaw.id,
      numeroOrden: orderRaw.numero_orden,
      numeroMesa: orderRaw.numero_mesa,
      fechaCreacion: orderRaw.fecha_creacion,
      estadoPedido: orderRaw.estado_pedido,
      estadoPago: orderRaw.estado_pago,
      total: Number(orderRaw.total || 0),
      propina: Number(orderRaw.propina || 0),
      notaGeneral: orderRaw.nota_general,
      cliente: clienteRaw ? {
        nombre: clienteRaw.nombre,
        telefono: clienteRaw.telefono
      } : undefined,
      tipoServicio: tipoServicioRaw,
      items
    };
  }
}
