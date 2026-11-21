import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/services/logger.service';
import { PrintJob } from '../../domain/models/print-job.model';
import { RenderContext } from '../../domain/models/render-context.model';
import { RendererFactory } from '../../infrastructure/renderers/renderer.factory';
import { WebPrinterAdapter } from '../../infrastructure/printers/web-printer.adapter';
import { BluetoothPrinterAdapter } from '../../infrastructure/printers/bluetooth-printer.adapter';
import { RawBtPrinterAdapter } from '../../infrastructure/printers/rawbt-printer.adapter';
import { HtmlTicketRenderer } from '../../infrastructure/renderers/html-ticket.renderer';
import { EscPosTicketRenderer } from '../../infrastructure/renderers/escpos-ticket.renderer';

@Injectable({
  providedIn: 'root'
})
export class PrintDispatcher {
  private rendererFactory = inject(RendererFactory);
  private webPrinter = inject(WebPrinterAdapter);
  private bluetoothPrinter = inject(BluetoothPrinterAdapter);
  private rawBtPrinter = inject(RawBtPrinterAdapter);
  private logger = inject(LoggerService);

  async dispatch(job: PrintJob): Promise<PrintJob> {
    if (!job.document) {
      throw new Error(`El trabajo de impresión ${job.id} no contiene un TicketDocument adjunto.`);
    }

    const context: RenderContext = {
      destination: job.destination,
      profile: job.profile,
      widthCharacters: job.profile === 'pos80' ? 42 : 32,
      showCutCommand: true
    };

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let renderMs = 0;
    let transportMs = 0;

    try {
      this.logger.info(`Despachando trabajo de impresión ${job.id} hacia [${job.destination}]`, undefined, 'PrintDispatcher');

      switch (job.destination) {
        case 'web': {
          const renderStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
          const htmlRenderer = this.rendererFactory.get('web') as HtmlTicketRenderer;
          const output = htmlRenderer.render(job.document, context);
          renderMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - renderStart);

          const transportStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
          await this.webPrinter.print(output);
          transportMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - transportStart);
          break;
        }

        case 'rawbt': {
          const renderStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
          const escPosRenderer = this.rendererFactory.get('rawbt') as EscPosTicketRenderer;
          const output = escPosRenderer.render(job.document, context);
          renderMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - renderStart);

          const transportStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
          await this.rawBtPrinter.print(output);
          transportMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - transportStart);
          break;
        }

        case 'bluetooth': {
          const renderStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
          const escPosRenderer = this.rendererFactory.get('bluetooth') as EscPosTicketRenderer;
          const output = escPosRenderer.render(job.document, context);
          renderMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - renderStart);

          const transportStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
          await this.bluetoothPrinter.print(output.payload);
          transportMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - transportStart);
          break;
        }

        default:
          throw new Error(`Destino de impresión no soportado por el despachador: ${job.destination}`);
      }

      const totalMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
      this.logger.info(`Impresión finalizada en ${totalMs}ms (render: ${renderMs}ms, transport: ${transportMs}ms)`, undefined, 'PrintDispatcher');

      return Object.freeze({
        ...job,
        status: 'completed',
        attempts: job.attempts + 1,
        metrics: {
          renderMs,
          transportMs,
          totalMs
        }
      });
    } catch (error: any) {
      const totalMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime);
      this.logger.error(`Fallo en el despacho de impresión ${job.id} tras ${totalMs}ms`, error, 'PrintDispatcher');

      return Object.freeze({
        ...job,
        status: 'failed',
        attempts: job.attempts + 1,
        error: error?.message || 'Error desconocido al imprimir',
        metrics: {
          renderMs,
          transportMs,
          totalMs
        }
      });
    }

  }
}
