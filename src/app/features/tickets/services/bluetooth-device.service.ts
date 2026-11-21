import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from '@core/services/logger.service';
import { Capacitor } from '@capacitor/core';

declare let bluetoothSerial: any;

export type BluetoothConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected' | 'error';

@Injectable({
  providedIn: 'root'
})
export class BluetoothDeviceService {
  private logger = inject(LoggerService);
  private platformId = inject(PLATFORM_ID);

  // Estado reactivo con Angular Signals
  readonly bluetoothDevices = signal<any[]>([]);
  readonly isBluetoothConnected = signal<boolean>(false);
  readonly connectionState = signal<BluetoothConnectionState>('disconnected');
  readonly errorMessage = signal<string>('');
  readonly selectedDeviceAddress = signal<string>('');
  readonly selectedDeviceName = signal<string>('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.selectedDeviceAddress.set(localStorage.getItem('selected_printer_mac') || '');
      this.selectedDeviceName.set(localStorage.getItem('selected_printer_name') || '');

      // Chequeo inicial defensivo en plataformas nativas
      if (Capacitor.isNativePlatform() && this.selectedDeviceAddress()) {
        this.checkBluetoothConnection().then(connected => {
          this.isBluetoothConnected.set(connected);
          if (connected) {
            this.connectionState.set('connected');
          }
        });
      }
    }
  }

  // --- Promesas Wrappers de cordova-plugin-bluetooth-serial ---

  checkBluetoothEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve(false);
        return;
      }
      bluetoothSerial.isEnabled(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  enableBluetooth(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve(false);
        return;
      }
      bluetoothSerial.enable(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  listBluetoothDevices(): Promise<any[]> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve([]);
        return;
      }
      bluetoothSerial.list(
        (devices: any[]) => resolve(devices),
        (err: any) => reject(err)
      );
    });
  }

  connectBluetooth(address: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        reject('Bluetooth no soportado en esta plataforma.');
        return;
      }
      bluetoothSerial.connect(
        address,
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  disconnectBluetooth(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve();
        return;
      }
      bluetoothSerial.disconnect(
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  writeBluetooth(data: string | Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof bluetoothSerial === 'undefined') {
        reject('Bluetooth no soportado en esta plataforma.');
        return;
      }
      bluetoothSerial.write(
        data,
        () => resolve(),
        (err: any) => reject(err)
      );
    });
  }

  checkBluetoothConnection(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof bluetoothSerial === 'undefined') {
        resolve(false);
        return;
      }
      bluetoothSerial.isConnected(
        () => resolve(true),
        () => resolve(false)
      );
    });
  }

  // --- Operaciones de Alto Nivel de Administración Hardware ---

  async scanDevices(): Promise<void> {
    this.connectionState.set('scanning');
    this.errorMessage.set('');
    try {
      const isEnabled = await this.checkBluetoothEnabled();
      if (!isEnabled) {
        const turnOn = await this.enableBluetooth();
        if (!turnOn) {
          this.connectionState.set('error');
          this.errorMessage.set('Deberás activar el Bluetooth en tu celular para poder imprimir.');
          return;
        }
      }

      const devices = await this.listBluetoothDevices();
      this.bluetoothDevices.set(devices);
      if (devices.length === 0) {
        this.errorMessage.set('No se encontraron dispositivos vinculados. Asegurate de emparejar la impresora en los Ajustes de Bluetooth de tu celular primero.');
      }
      this.connectionState.set('disconnected');
    } catch (err) {
      this.logger.error('Error listing devices', err, 'BluetoothDeviceService');
      this.connectionState.set('error');
      this.errorMessage.set('Ocurrió un error al escanear los dispositivos Bluetooth.');
    }
  }

  async selectAndConnectPrinter(address: string, name: string): Promise<void> {
    this.connectionState.set('connecting');
    this.errorMessage.set('');
    try {
      const isConnected = await this.checkBluetoothConnection();
      if (isConnected) {
        await this.disconnectBluetooth();
      }

      await this.connectBluetooth(address);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('selected_printer_mac', address);
        localStorage.setItem('selected_printer_name', name);
      }
      this.selectedDeviceAddress.set(address);
      this.selectedDeviceName.set(name);
      this.isBluetoothConnected.set(true);
      this.connectionState.set('connected');
    } catch (err: any) {
      this.logger.error('Error connecting to printer', err, 'BluetoothDeviceService');
      this.isBluetoothConnected.set(false);
      this.connectionState.set('error');
      this.errorMessage.set(`No se pudo conectar con ${name}. Asegurate de que la impresora esté encendida y cerca.`);
    }
  }

  async disconnectPrinter(): Promise<void> {
    try {
      await this.disconnectBluetooth();
    } catch (e) {
      this.logger.error('Error disconnecting printer', e, 'BluetoothDeviceService');
    }
    this.isBluetoothConnected.set(false);
    this.connectionState.set('disconnected');
  }
}
