import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from '@core/services/logger.service';
import { PrinterPort } from '../../domain/ports/printer.port';
import { RenderOutput } from '../../domain/models/render-output.model';

@Injectable({
  providedIn: 'root'
})
export class RawBtPrinterAdapter implements PrinterPort<RenderOutput<string | Uint8Array> | string | Uint8Array> {
  private logger = inject(LoggerService);
  private platformId = inject(PLATFORM_ID);

  async print(output: RenderOutput<string | Uint8Array> | string | Uint8Array): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const payload = (typeof output === 'object' && output !== null && 'payload' in output) 
        ? output.payload 
        : output;

      let base64Data: string;

      if (payload instanceof Uint8Array) {
        let binary = '';
        for (let i = 0; i < payload.byteLength; i++) {
          binary += String.fromCharCode(payload[i]);
        }
        base64Data = btoa(binary);
      } else if (typeof payload === 'string') {
        base64Data = btoa(unescape(encodeURIComponent(payload)));
      } else {
        throw new Error('Formato de payload no soportado para RawBT');
      }

      const rawbtUrl = `rawbt:base64,${base64Data}`;

      // Invocación del esquema oficial rawbt: en Android y Web
      const link = document.createElement('a');
      link.href = rawbtUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 1000);

      this.logger.info('Comanda enviada a RawBT con éxito', undefined, 'RawBtPrinterAdapter');
    } catch (err) {
      this.logger.error('Error al enviar comanda a RawBT', err, 'RawBtPrinterAdapter');
      throw err;
    }
  }
}
