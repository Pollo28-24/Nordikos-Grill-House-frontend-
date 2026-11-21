import { Component, inject, signal, input, effect, output, ViewEncapsulation, PLATFORM_ID, untracked } from '@angular/core';
import { DatePipe, DecimalPipe, isPlatformBrowser } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { TicketService } from '../services/ticket.service';
import { BluetoothDeviceService } from '../services/bluetooth-device.service';
import { TicketData } from '../models/ticket.model';
import { ToastService } from '@core/services/toast.service';
import { Capacitor } from '@capacitor/core';

@Component({
  selector: 'app-ticket-print',
  standalone: true,
  imports: [DatePipe, DecimalPipe, LucideAngularModule],
  templateUrl: './ticket-print.component.html',
  styleUrls: ['./ticket-print.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TicketPrintComponent {
  private ticketService = inject(TicketService);
  private bluetoothService = inject(BluetoothDeviceService);
  private toastService = inject(ToastService);
  private platformId = inject(PLATFORM_ID);

  orderId = input.required<string | number>();
  ticketType = input<'account' | 'kitchen'>('account');
  autoPrint = input<boolean>(false);
  ticketData = signal<TicketData | null>(null);
  loading = signal(false);
  loadErrorMessage = signal<string>('');
  readyToPrint = output<void>();
  close = output<void>();

  // Bluetooth signals expuestas desde el servicio especializado de hardware
  isNative = isPlatformBrowser(this.platformId) && Capacitor.isNativePlatform();
  bluetoothDevices = this.bluetoothService.bluetoothDevices;
  isBluetoothConnected = this.bluetoothService.isBluetoothConnected;
  connectionState = this.bluetoothService.connectionState;
  errorMessage = this.bluetoothService.errorMessage;
  selectedDeviceAddress = this.bluetoothService.selectedDeviceAddress;
  selectedDeviceName = this.bluetoothService.selectedDeviceName;

  constructor() {
    effect(() => {
      const id = this.orderId();
      if (id) {
        untracked(() => {
          this.loadTicket(Number(id));
        });
      }
    });
  }

  async loadTicket(id: number) {
    this.loading.set(true);
    this.loadErrorMessage.set('');
    this.ticketData.set(null); // Reset current data
    try {
      const data = await this.ticketService.getTicketData(id);
      this.ticketData.set(data);
      if (!data) {
        this.loadErrorMessage.set('No se pudieron obtener los datos de la comanda.');
      } else if (this.autoPrint()) {
        setTimeout(() => {
          if (!this.loading()) {
            this.readyToPrint.emit();
          }
        }, 500);
      }
    } catch (err) {
      this.ticketData.set(null);
      this.loadErrorMessage.set('Error de conexión al cargar el ticket.');
    } finally {
      this.loading.set(false);
    }
  }

  retry() {
    const id = this.orderId();
    if (id) {
      this.loadTicket(Number(id));
    }
  }

  print() {
    const data = this.ticketData();
    if (data) {
      const el = document.querySelector('.ticket') as HTMLElement;
      this.ticketService.printTicket(data, this.ticketType(), el);
    }
  }

  printRawBt() {
    const data = this.ticketData();
    if (data) {
      this.ticketService.printTicketRawBt(data, this.ticketType());
    }
  }

  async shareOrCopy() {
    const data = this.ticketData();
    if (!data) return;
    const result = await this.ticketService.shareOrCopyTicket(data);
    if (result === 'copied') {
      this.toastService.show('¡Ticket copiado al portapapeles!', 'success');
    } else if (result === 'shared') {
      // Compartido de forma nativa con éxito
    } else {
      this.toastService.show('No se pudo compartir el ticket.', 'error');
    }
  }

  scanBluetooth() {
    this.bluetoothService.scanDevices();
  }

  connectPrinter(device: any) {
    this.bluetoothService.selectAndConnectPrinter(device.address, device.name);
  }

  disconnectPrinter() {
    this.bluetoothService.disconnectPrinter();
  }
}
