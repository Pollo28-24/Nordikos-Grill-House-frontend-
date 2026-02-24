import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {

  private _state = signal<ConfirmOptions | null>(null);

  readonly state = this._state.asReadonly();

  open(options: ConfirmOptions) {
    this._state.set({
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      ...options
    });
  }

  confirm() {
    const current = this._state();
    current?.onConfirm?.();
    this.close();
  }

  close() {
    this._state.set(null);
  }
}
