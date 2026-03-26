import { openDB, IDBPDatabase } from 'idb';
import { OrderCreateDto } from '../models/order.model';

export interface LocalOrder {
  id: string; // client_request_id
  status: 'pending' | 'synced' | 'failed';
  payload: OrderCreateDto;
  createdAt: number;
  errorMessage?: string;
}

export class OrderDatabase {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB('nordikos-orders-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('orders')) {
          db.createObjectStore('orders', { keyPath: 'id' });
        }
      },
    });
  }

  async saveOrder(order: LocalOrder) {
    const db = await this.dbPromise;
    return db.put('orders', order);
  }

  async getAllOrders(): Promise<LocalOrder[]> {
    const db = await this.dbPromise;
    return db.getAll('orders');
  }

  async deleteOrder(id: string) {
    const db = await this.dbPromise;
    return db.delete('orders', id);
  }

  async getPendingOrders(): Promise<LocalOrder[]> {
    const orders = await this.getAllOrders();
    return orders.filter(o => o.status !== 'synced');
  }
}

export const orderDb = new OrderDatabase();
