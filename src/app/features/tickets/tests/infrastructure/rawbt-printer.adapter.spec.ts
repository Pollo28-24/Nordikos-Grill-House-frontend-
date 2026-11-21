import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { RawBtPrinterAdapter } from '../../infrastructure/printers/rawbt-printer.adapter';
import { LoggerService } from '@core/services/logger.service';

describe('RawBtPrinterAdapter', () => {
  let adapter: RawBtPrinterAdapter;
  let loggerMock: jasmine.SpyObj<LoggerService>;

  beforeEach(() => {
    loggerMock = jasmine.createSpyObj('LoggerService', ['error', 'warn', 'info']);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        RawBtPrinterAdapter,
        { provide: LoggerService, useValue: loggerMock },
        { provide: PLATFORM_ID, useValue: 'browser' }
      ]
    });

    adapter = TestBed.inject(RawBtPrinterAdapter);
  });

  it('debe procesar un string ESC/POS y disparar el esquema rawbt:base64', async () => {
    let capturedHref = '';
    const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      capturedHref = this.href;
    });

    await adapter.print('TEST ESCPOS DATA');

    expect(clickSpy).toHaveBeenCalled();
    expect(capturedHref).toContain('rawbt:base64,');
  });

  it('debe procesar un Uint8Array y convertirlo correctamente a Base64', async () => {
    let capturedHref = '';
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      capturedHref = this.href;
    });

    const bytes = new Uint8Array([0x1B, 0x40, 0x41, 0x42]); // ESC @ A B
    await adapter.print(bytes);

    expect(capturedHref).toContain('rawbt:base64,');
    expect(loggerMock.info).toHaveBeenCalled();
  });

  it('debe desempaquetar RenderOutput<string> correctamente', async () => {
    let capturedHref = '';
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      capturedHref = this.href;
    });

    await adapter.print({
      mediaType: 'application/octet-stream',
      payload: 'PAYLOAD DENTRO DE RENDER OUTPUT'
    });

    expect(capturedHref).toContain('rawbt:base64,');
  });
});
