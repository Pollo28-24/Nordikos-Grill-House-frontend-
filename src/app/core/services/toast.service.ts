import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();
  private timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, type: ToastType = 'success', duration = 3000) {
    const id = ++this.counter;

    const toast: Toast = { id, message, type };

    this._toasts.update((t) => [...t, toast].slice(-5));

    const timer = setTimeout(() => {
      this.remove(id);
    }, duration);

    this.timers.set(id, timer);
  }

  remove(id: number) {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this._toasts.update((t) => t.filter((toast) => toast.id !== id));
  }
}
