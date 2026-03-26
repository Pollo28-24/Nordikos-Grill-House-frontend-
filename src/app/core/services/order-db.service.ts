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
  private dbPromise: Promise<IDBPDatabase | null> = Promise.resolve(null);
  private isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

  constructor() {
    if (this.isBrowser) {
      this.dbPromise = openDB('nordikos-orders-db', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('orders')) {
            db.createObjectStore('orders', { keyPath: 'id' });
          }
        },
      });
    }
  }

  async saveOrder(order: LocalOrder) {
    if (!this.isBrowser) return;
    const db = await this.dbPromise;
    if (db) return db.put('orders', order);
  }

  async getAllOrders(): Promise<LocalOrder[]> {
    if (!this.isBrowser) return [];
    const db = await this.dbPromise;
    if (db) return db.getAll('orders');
    return [];
  }

  async deleteOrder(id: string) {
    if (!this.isBrowser) return;
    const db = await this.dbPromise;
    if (db) return db.delete('orders', id);
  }

  async getPendingOrders(): Promise<LocalOrder[]> {
    if (!this.isBrowser) return [];
    const orders = await this.getAllOrders();
    return orders.filter(o => o.status !== 'synced');
  }
}

export const orderDb = new OrderDatabase();
