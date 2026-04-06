import { Injectable } from '@angular/core';
import { openDB, IDBPDatabase } from 'idb';
import { OrderCreateDto } from '../models/order.model';

export interface LocalOrder {
  id: string; // client_request_id
  status: 'pending' | 'synced' | 'failed';
  payload: OrderCreateDto;
  createdAt: number;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
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

  async save(order: LocalOrder): Promise<void> {
    if (!this.isBrowser) return;
    const db = await this.dbPromise;
    if (db) {
      await db.put('orders', order);
    }
  }

  async markSynced(id: string): Promise<void> {
    if (!this.isBrowser) return;
    const db = await this.dbPromise;
    if (db) {
      const order = await db.get('orders', id);
      if (order) {
        order.status = 'synced';
        await db.put('orders', order);
      }
    }
  }

  async markFailed(id: string, error: string): Promise<void> {
    if (!this.isBrowser) return;
    const db = await this.dbPromise;
    if (db) {
      const order = await db.get('orders', id);
      if (order) {
        order.status = 'failed';
        order.errorMessage = error;
        await db.put('orders', order);
      }
    }
  }

  async getPending(): Promise<LocalOrder[]> {
    if (!this.isBrowser) return [];
    const db = await this.dbPromise;
    if (db) {
      const orders = await db.getAll('orders');
      return orders.filter((o: LocalOrder) => o.status !== 'synced');
    }
    return [];
  }

  async getAllOrders(): Promise<LocalOrder[]> {
    if (!this.isBrowser) return [];
    const db = await this.dbPromise;
    if (db) return db.getAll('orders');
    return [];
  }

  async deleteOrder(id: string): Promise<void> {
    if (!this.isBrowser) return;
    const db = await this.dbPromise;
    if (db) {
      await db.delete('orders', id);
    }
  }
}

export const orderDb = new OrderDatabase();
