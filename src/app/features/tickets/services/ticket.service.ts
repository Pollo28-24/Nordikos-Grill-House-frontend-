import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from '@core/services/logger.service';
import { TicketData } from '../models/ticket.model';
import { PrintableOrder } from '../domain/models/printable-order.model';
import { TicketDocument, TicketDocumentType } from '../domain/models/ticket-document.model';
import { TicketDocumentBuilder } from '../domain/builders/ticket-document.builder';
import { SupabaseOrderRepository } from '../infrastructure/repositories/supabase-order.repository';
import { LegacyTicketMapper } from '../infrastructure/mappers/legacy-ticket.mapper';
import { PrintTicketUseCase } from '../application/use-cases/print-ticket.usecase';
import { CustomerAccountPolicy, KitchenOrderPolicy } from '../domain/policies/ticket.policy';
import { PrintJob } from '../domain/models/print-job.model';
import { WhatsappTicketRenderer } from '../infrastructure/renderers/whatsapp-ticket.renderer';
import { HtmlTicketRenderer } from '../infrastructure/renderers/html-ticket.renderer';
import { EscPosTicketRenderer } from '../infrastructure/renderers/escpos-ticket.renderer';
import { WebPrinterAdapter } from '../infrastructure/printers/web-printer.adapter';
import { RendererFactory } from '../infrastructure/renderers/renderer.factory';
import { PdfTicketRenderer } from '../infrastructure/renderers/pdf-ticket.renderer';
import { PdfShareAdapter } from '../infrastructure/printers/pdf-share.adapter';
import { BluetoothDeviceService } from './bluetooth-device.service';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private orderRepository = inject(SupabaseOrderRepository);
  private printTicketUseCase = inject(PrintTicketUseCase);
  private rendererFactory = inject(RendererFactory);
  private pdfShareAdapter = inject(PdfShareAdapter);
  private bluetoothDeviceService = inject(BluetoothDeviceService);
  private whatsappRenderer = new WhatsappTicketRenderer();
  private htmlRenderer = new HtmlTicketRenderer();
  private escPosRenderer = new EscPosTicketRenderer();
  private webPrinter = inject(WebPrinterAdapter);
  private logger = inject(LoggerService);
  private platformId = inject(PLATFORM_ID);

  // Proxies reactivos de Bluetooth hacia BluetoothDeviceService (mantiene retrocompatibilidad)
  readonly bluetoothDevices = this.bluetoothDeviceService.bluetoothDevices;
  readonly isBluetoothConnected = this.bluetoothDeviceService.isBluetoothConnected;
  readonly connectionState = this.bluetoothDeviceService.connectionState;
  readonly errorMessage = this.bluetoothDeviceService.errorMessage;
  readonly selectedDeviceAddress = this.bluetoothDeviceService.selectedDeviceAddress;
  readonly selectedDeviceName = this.bluetoothDeviceService.selectedDeviceName;

  // Proxies de hardware para retrocompatibilidad
  scanDevices() {
    return this.bluetoothDeviceService.scanDevices();
  }

  selectAndConnectPrinter(address: string, name: string) {
    return this.bluetoothDeviceService.selectAndConnectPrinter(address, name);
  }

  disconnectPrinter() {
    return this.bluetoothDeviceService.disconnectPrinter();
  }

  // --- Fachada de Aplicación Documental ---

  async getTicketData(orderId: number): Promise<TicketData | null> {
    const printable = await this.orderRepository.findById(orderId);
    return printable ? LegacyTicketMapper.toTicketData(printable) : null;
  }

  async getPrintableOrder(orderId: number): Promise<PrintableOrder | null> {
    return this.orderRepository.findById(orderId);
  }

  async getTicketDocument(orderId: number, type: TicketDocumentType = 'account'): Promise<TicketDocument | null> {
    const printable = await this.orderRepository.findById(orderId);
    if (!printable) return null;
    return TicketDocumentBuilder.build(printable, { documentType: type });
  }

  async printOrder(orderId: number, type: TicketDocumentType = 'account'): Promise<PrintJob> {
    const isNative = Capacitor.isNativePlatform();
    const policy = type === 'kitchen' ? KitchenOrderPolicy : CustomerAccountPolicy;
    return this.printTicketUseCase.execute(orderId, { policy, isNative });
  }

  async printTicket(data?: TicketData, type: 'account' | 'kitchen' = 'account', element?: HTMLElement | null) {
    if (!isPlatformBrowser(this.platformId)) return;

    const isNative = Capacitor.isNativePlatform();

    if (isNative && data) {
      try {
        const isConnected = await this.bluetoothDeviceService.checkBluetoothConnection();
        if (isConnected) {
          await this.printTicketBluetooth(data, type);
          return;
        }

        // Intentar auto-conectar con la guardada
        const savedMac = this.selectedDeviceAddress();
        if (savedMac) {
          this.bluetoothDeviceService.connectionState.set('connecting');
          try {
            await this.bluetoothDeviceService.connectBluetooth(savedMac);
            this.bluetoothDeviceService.isBluetoothConnected.set(true);
            this.bluetoothDeviceService.connectionState.set('connected');
            await this.printTicketBluetooth(data, type);
            return;
          } catch (err) {
            this.logger.warn('Failed to auto-connect to saved printer, falling back to scanning', err, 'TicketService');
            this.bluetoothDeviceService.isBluetoothConnected.set(false);
            this.bluetoothDeviceService.connectionState.set('error');
            this.bluetoothDeviceService.errorMessage.set('No se pudo auto-conectar a la impresora. Elegí un dispositivo de la lista abajo.');
          }
        }

        // Si no está conectada y no se pudo auto-conectar, escaneamos automáticamente
        await this.scanDevices();
      } catch (e) {
        this.logger.error('Error printTicket native', e, 'TicketService');
        this.bluetoothDeviceService.connectionState.set('error');
        this.bluetoothDeviceService.errorMessage.set('Error en el sistema de impresión Bluetooth.');
      }
      return;
    }

    // Impresión Web Normal Aislada delegada al pipeline documental
    try {
      if (data) {
        const printable = LegacyTicketMapper.toPrintableOrder(data);
        const policy = type === 'kitchen' ? KitchenOrderPolicy : CustomerAccountPolicy;
        const document = TicketDocumentBuilder.build(printable, { policy });
        const output = this.htmlRenderer.render(document, { profile: 'pos58', destination: 'web' });
        await this.webPrinter.print(output);
      } else if (element) {
        await this.webPrinter.print(element.outerHTML);
      } else {
        setTimeout(() => window.print(), 100);
      }
    } catch (e) {
      this.logger.error('Error triggering web print', e, 'TicketService');
      setTimeout(() => window.print(), 100);
    }
  }

  async printTicketBluetooth(data: TicketData, type: 'account' | 'kitchen') {
    try {
      const printable = LegacyTicketMapper.toPrintableOrder(data);
      const policy = type === 'kitchen' ? KitchenOrderPolicy : CustomerAccountPolicy;
      const document = TicketDocumentBuilder.build(printable, { policy });
      const output = this.escPosRenderer.render(document, { profile: 'pos58', destination: 'bluetooth' });
      await this.bluetoothDeviceService.writeBluetooth(output.payload);
    } catch (err) {
      this.logger.error('Error writing to bluetooth printer', err, 'TicketService');
      this.bluetoothDeviceService.isBluetoothConnected.set(false);
      this.bluetoothDeviceService.connectionState.set('error');
      this.bluetoothDeviceService.errorMessage.set('Se perdió la comunicación con la impresora térmica.');
      throw err;
    }
  }

  async shareOrCopyTicket(data: TicketData): Promise<'shared' | 'copied' | 'failed'> {
    if (!isPlatformBrowser(this.platformId)) {
      return 'failed';
    }

    const isNative = Capacitor.isNativePlatform();
    const printable = LegacyTicketMapper.toPrintableOrder(data);
    const document = TicketDocumentBuilder.build(printable, { policy: CustomerAccountPolicy });
    const text = this.whatsappRenderer.render(document);
    const title = `Ticket Orden #${data.order.numero_orden || data.order.id}`;

    if (isNative) {
      try {
        const { Share } = await import('@capacitor/share');
        await Share.share({
          title: title,
          text: text,
          dialogTitle: 'Enviar o Guardar Ticket',
        });
        return 'shared';
      } catch (e) {
        this.logger.error('Error sharing ticket on native', e, 'TicketService');
        return 'failed';
      }
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
        });
        return 'shared';
      } catch (e: any) {
        if (e.name === 'AbortError') {
          return 'shared';
        }
        this.logger.warn('Error sharing ticket via navigator.share, falling back to clipboard', e, 'TicketService');
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return 'copied';
      } catch (e) {
        this.logger.error('Error copying ticket to clipboard', e, 'TicketService');
        return 'failed';
      }
    }

    return 'failed';
  }

  async shareTicketPDF(data: TicketData): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const order = LegacyTicketMapper.toPrintableOrder(data);
      const document = TicketDocumentBuilder.build(order, { policy: CustomerAccountPolicy });
      const pdfRenderer = this.rendererFactory.get('pdf') as PdfTicketRenderer;
      const output = await pdfRenderer.render(document);
      const orderNum = document.metadata.orderNumber ?? document.metadata.orderId;
      const fileName = `Ticket_Orden_${orderNum}.pdf`;

      await this.pdfShareAdapter.share(output, fileName);
    } catch (err: any) {
      this.logger.error('Error generating/sharing PDF ticket via pipeline', err, 'TicketService');
      throw err;
    }
  }
}
