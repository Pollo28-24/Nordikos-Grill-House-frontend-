export interface TicketModifier {
  nombre_modificador: string;
  cantidad: number;
  precio_unitario: number;
}

export interface TicketItem {
  id: number;
  order_id: number;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  nota?: string; // Nuevo campo
  variante?: string; // Nuevo campo
  modificadores?: TicketModifier[];
}

export interface TicketOrder {
  id: number;
  numero_orden?: number; // Nuevo campo
  fecha_creacion: string;
  estado_pedido: string;
  estado_pago: string;
  total: number;
  propina: number;
  nota_general?: string; // Nuevo campo
  cliente?: {
    nombre: string;
    telefono?: string;
  };
  tipo_servicio?: string;
}

export interface TicketData {
  order: TicketOrder;
  items: TicketItem[];
}
