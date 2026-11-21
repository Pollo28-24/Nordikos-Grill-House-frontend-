import { PrintableOrder } from '../../domain/models/printable-order.model';

export const MOCK_HAMBURGER_ORDER: PrintableOrder = Object.freeze({
  id: 101,
  numeroOrden: 24,
  numeroMesa: '4',
  fechaCreacion: '2026-10-12T20:30:00.000Z',
  estadoPedido: 'preparando',
  estadoPago: 'pagado',
  total: 215,
  propina: 25,
  notaGeneral: 'Término medio, por favor',
  tipoServicio: 'Comedor',
  cliente: Object.freeze({
    nombre: 'Carlos Gardel',
    telefono: '555-123456'
  }),
  items: Object.freeze([
    Object.freeze({
      id: 1,
      orderId: 101,
      nombreProducto: 'Hamburguesa Nórdika Doble',
      cantidad: 1,
      precioUnitario: 150,
      total: 190,
      variante: 'Pan brioche',
      nota: 'Sin cebolla',
      estado: 'completado',
      modificadores: Object.freeze([
        Object.freeze({
          nombre: 'Tocineta Extra',
          cantidad: 1,
          precioUnitario: 40
        })
      ])
    })
  ])
});

export const MOCK_WALK_IN_ORDER: PrintableOrder = Object.freeze({
  id: 102,
  numeroOrden: 25,
  numeroMesa: '2',
  fechaCreacion: '2026-10-12T21:00:00.000Z',
  estadoPedido: 'pendiente',
  estadoPago: 'pendiente',
  total: 95,
  propina: 0,
  tipoServicio: 'Barra',
  cliente: undefined,
  items: Object.freeze([
    Object.freeze({
      id: 2,
      orderId: 102,
      nombreProducto: 'Papas Rústicas',
      cantidad: 1,
      precioUnitario: 95,
      total: 95,
      modificadores: Object.freeze([])
    })
  ])
});

export const MOCK_EMPTY_ORDER: PrintableOrder = Object.freeze({
  id: 103,
  numeroOrden: 26,
  fechaCreacion: '2026-10-12T21:15:00.000Z',
  estadoPedido: 'pendiente',
  estadoPago: 'pendiente',
  total: 0,
  propina: 0,
  tipoServicio: 'Para llevar',
  items: Object.freeze([])
});
