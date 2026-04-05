import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { openDB, IDBPDatabase } from 'idb';
import { LoggerService } from './logger.service';
import { OrderCreateDto } from '../models/order.model';

export interface LocalOrder {
  id: string;
  status: 'pending' | 'synced' | 'failed';
  payload: OrderCreateDto;
  createdAt: number;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderDatabase {
  private platformId = inject(PLATFORM_ID);
  private logger = inject(LoggerService);
  private dbPromise: Promise<IDBPDatabase | null> | null = null;

  private isBrowser() {
    return isPlatformBrowser(this.platformId);
  }

  private async getDB(): Promise<IDBPDatabase | null> {
    if (!this.isBrowser()) return null;

    if (!this.dbPromise) {
      this.dbPromise = openDB('nordikos-orders-db', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('orders')) {
            db.createObjectStore('orders', { keyPath: 'id' });
          }
        },
      }).catch(err => {
        this.logger.error('Error opening IndexedDB', err, 'OrderDatabase');
        return null;
      });
    }

    return this.dbPromise;
  }

  async save(order: LocalOrder): Promise<void> {
    const db = await this.getDB();
    if (!db) return;
    await db.put('orders', order);
  }

  async getAll(): Promise<LocalOrder[]> {
    const db = await this.getDB();
    if (!db) return [];
    return db.getAll('orders');
  }

  async getPending(): Promise<LocalOrder[]> {
    const orders = await this.getAll();
    return orders.filter(o => o.status !== 'synced');
  }

  async markSynced(id: string): Promise<void> {
    const db = await this.getDB();
    if (!db) return;

    const existing = await db.get('orders', id);
    if (!existing) return;

    existing.status = 'synced';
    await db.put('orders', existing);
  }

  async markFailed(id: string, error: string): Promise<void> {
    const db = await this.getDB();
    if (!db) return;

    const existing = await db.get('orders', id);
    if (!existing) return;

    existing.status = 'failed';
    existing.errorMessage = error;
    await db.put('orders', existing);
  }
}
