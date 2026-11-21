import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/services/logger.service';
import { PrinterPort } from '../../domain/ports/printer.port';

declare let bluetoothSerial: any;

@Injectable({
  providedIn: 'root'
})
export class BluetoothPrinterAdapter implements PrinterPort<string | Uint8Array> {
  private logger = inject(LoggerService);

  async print(data: string | Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        const error = new Error('Hardware Bluetooth no disponible en esta plataforma.');
        this.logger.error('BluetoothPrinterAdapter error', error, 'BluetoothPrinterAdapter');
        reject(error);
        return;
      }

      bluetoothSerial.write(
        data,
        () => resolve(),
        (err: any) => {
          this.logger.error('Error writing to bluetooth printer', err, 'BluetoothPrinterAdapter');
          reject(err);
        }
      );
    });
  }
}
