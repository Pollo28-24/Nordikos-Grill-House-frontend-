import { PrintableOrder } from '../models/printable-order.model';

export interface PrintableOrderRepository {
  findById(orderId: number): Promise<PrintableOrder | null>;
}
