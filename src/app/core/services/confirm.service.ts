import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  showInput?: boolean;
  inputPlaceholder?: string;
  isDanger?: boolean;
  onConfirm?: (inputValue?: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmService {

  private _state = signal<ConfirmOptions | null>(null);
  private _inputValue = signal<string>('');

  readonly state = this._state.asReadonly();
  readonly inputValue = this._inputValue.asReadonly();

  open(options: ConfirmOptions) {
    this._inputValue.set('');
    this._state.set({
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      showInput: false,
      isDanger: false,
      ...options
    });
  }

  setInputValue(value: string) {
    this._inputValue.set(value);
  }

  confirm() {
    const current = this._state();
    const value = this._inputValue();
    current?.onConfirm?.(value);
    this.close();
  }

  close() {
    this._state.set(null);
  }
}
