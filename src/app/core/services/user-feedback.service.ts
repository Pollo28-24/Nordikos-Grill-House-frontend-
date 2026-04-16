import { Injectable, inject } from '@angular/core';
import { ConfirmService } from './confirm.service';
import { ToastService } from './toast.service';
import { firstValueFrom, isObservable, Observable } from 'rxjs';

export interface ConfirmExecuteOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  action: () => Promise<any> | Observable<any> | any;
  successMsg?: string;
  errorMsg?: string;
}

@Injectable({ providedIn: 'root' })
export class UserFeedbackService {
  private confirmService = inject(ConfirmService);
  private toastService = inject(ToastService);

  confirmAndExecute(options: ConfirmExecuteOptions): void {
    this.confirmService.open({
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? 'Confirmar',
      cancelText: options.cancelText ?? 'Cancelar',
      onConfirm: async () => {
        try {
          // Ejecutamos la acción (soporta Promesas, Observables y Sync)
          let result = options.action();
          
          if (isObservable(result)) {
            result = await firstValueFrom(result);
          } else if (result instanceof Promise) {
            result = await result;
          }

          // Si el resultado es explícitamente "false", lo tratamos como error (convención común de servicios)
          if (result === false) {
             throw new Error(options.errorMsg ?? 'Operación fallida');
          }
          
          if (options.successMsg) {
             this.toastService.show(options.successMsg, 'success');
          }
        } catch (error: any) {
          if (options.errorMsg) {
             this.toastService.show(options.errorMsg, 'error');
          } else {
             // Fallback default
             this.toastService.show(error?.message ?? 'Ocurrió un error inesperado', 'error');
          }
        }
      }
    });
  }

  showSuccess(message: string) {
    this.toastService.show(message, 'success');
  }

  showError(message: string) {
    this.toastService.show(message, 'error');
  }
}
