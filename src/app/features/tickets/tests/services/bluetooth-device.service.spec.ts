import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { BluetoothDeviceService } from '../../services/bluetooth-device.service';
import { LoggerService } from '@core/services/logger.service';

describe('BluetoothDeviceService', () => {
  let service: BluetoothDeviceService;
  let loggerMock: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    localStorage.clear();
    loggerMock = jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info']);

    // Setup global bluetoothSerial mock
    (window as any).bluetoothSerial = {
      isEnabled: (success: () => void, _fail: () => void) => success(),
      enable: (success: () => void, _fail: () => void) => success(),
      list: (success: (devices: any[]) => void, _fail: (err: any) => void) =>
        success([{ name: 'Thermal-58', address: '00:11:22:33:44:55' }]),
      connect: (_address: string, success: () => void, _fail: (err: any) => void) => success(),
      disconnect: (success: () => void, _fail: (err: any) => void) => success(),
      isConnected: (success: () => void, _fail: () => void) => success(),
      write: (_data: any, success: () => void, _fail: (err: any) => void) => success()
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        BluetoothDeviceService,
        { provide: LoggerService, useValue: loggerMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    service = TestBed.inject(BluetoothDeviceService);
  });

  afterEach(() => {
    delete (window as any).bluetoothSerial;
    localStorage.clear();
  });

  it('debe inicializarse con señales reactivas por defecto', () => {
    expect(service.bluetoothDevices()).toEqual([]);
    expect(service.isBluetoothConnected()).toBeFalse();
    expect(service.connectionState()).toBe('disconnected');
    expect(service.errorMessage()).toBe('');
    expect(service.selectedDeviceAddress()).toBe('');
    expect(service.selectedDeviceName()).toBe('');
  });

  it('debe listar dispositivos y actualizar el estado al escanear', async () => {
    await service.scanDevices();

    expect(service.bluetoothDevices().length).toBe(1);
    expect(service.bluetoothDevices()[0].name).toBe('Thermal-58');
    expect(service.connectionState()).toBe('disconnected');
    expect(service.errorMessage()).toBe('');
  });

  it('debe conectar a una impresora, actualizar signals y persistir en localStorage', async () => {
    await service.selectAndConnectPrinter('00:11:22:33:44:55', 'Thermal-58');

    expect(service.isBluetoothConnected()).toBeTrue();
    expect(service.connectionState()).toBe('connected');
    expect(service.selectedDeviceAddress()).toBe('00:11:22:33:44:55');
    expect(service.selectedDeviceName()).toBe('Thermal-58');
    expect(localStorage.getItem('selected_printer_mac')).toBe('00:11:22:33:44:55');
    expect(localStorage.getItem('selected_printer_name')).toBe('Thermal-58');
  });

  it('debe manejar error si falla la conexión y actualizar estado de error', async () => {
    (window as any).bluetoothSerial.connect = (_address: string, _success: any, fail: (err: any) => void) => {
      fail(new Error('Connection timeout'));
    };

    await service.selectAndConnectPrinter('99:99:99:99:99:99', 'Failing-Printer');

    expect(service.isBluetoothConnected()).toBeFalse();
    expect(service.connectionState()).toBe('error');
    expect(service.errorMessage()).toContain('No se pudo conectar con Failing-Printer');
    expect(loggerMock.error).toHaveBeenCalled();
  });

  it('debe desconectar la impresora y resetear el estado', async () => {
    service.isBluetoothConnected.set(true);
    service.connectionState.set('connected');

    await service.disconnectPrinter();

    expect(service.isBluetoothConnected()).toBeFalse();
    expect(service.connectionState()).toBe('disconnected');
  });

  it('debe responder gracefully cuando bluetoothSerial no está definido', async () => {
    delete (window as any).bluetoothSerial;

    const isEnabled = await service.checkBluetoothEnabled();
    expect(isEnabled).toBeFalse();

    const devices = await service.listBluetoothDevices();
    expect(devices).toEqual([]);

    await expectAsync(service.connectBluetooth('00:00:00')).toBeRejected();
  });
});
