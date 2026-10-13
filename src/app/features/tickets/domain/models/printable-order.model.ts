export interface PrintableModifier {
  readonly nombre: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
}

export interface PrintableItem {
  readonly id: number;
  readonly orderId: number;
  readonly nombreProducto: string;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly total: number;
  readonly nota?: string;
  readonly variante?: string;
  readonly estado?: string;
  readonly modificadores: readonly PrintableModifier[];
}

export interface PrintableCustomer {
  readonly nombre: string;
  readonly telefono?: string;
}

export interface PrintableOrder {
  readonly id: number;
  readonly numeroOrden?: number;
  readonly numeroMesa?: string;
  readonly fechaCreacion: string;
  readonly estadoPedido: string;
  readonly estadoPago: string;
  readonly total: number;
  readonly propina: number;
  readonly notaGeneral?: string;
  readonly cliente?: PrintableCustomer;
  readonly tipoServicio?: string;
  readonly items: readonly PrintableItem[];
}

