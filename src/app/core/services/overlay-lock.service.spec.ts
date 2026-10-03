import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID, provideZonelessChangeDetection, RendererFactory2 } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { OverlayLockService } from './overlay-lock.service';

describe('OverlayLockService', () => {
  let service: OverlayLockService;
  let mockDocument: any;

  beforeEach(() => {
    mockDocument = {
      body: {
        style: {} as any
      },
      documentElement: {
        scrollTop: 150
      }
    };

    const mockRendererFactory = {
      createRenderer: () => ({
        setStyle: () => {},
        removeStyle: () => {}
      })
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        OverlayLockService,
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: mockDocument },
        { provide: RendererFactory2, useValue: mockRendererFactory }
      ]
    });

    service = TestBed.inject(OverlayLockService);
  });

  it('debe iniciar desbloqueado (isLocked === false)', () => {
    expect(service.isLocked()).toBeFalse();
  });

  it('debe bloquear el body en la primera llamada (0 -> 1)', () => {
    service.lock();
    expect(service.isLocked()).toBeTrue();
  });

  it('debe mantener el body bloqueado en modales anidados (1 -> 2 -> 1)', () => {
    service.lock(); // Modal A abre (count: 1)
    expect(service.isLocked()).toBeTrue();

    service.lock(); // Modal B abre (count: 2)
    expect(service.isLocked()).toBeTrue();

    service.unlock(); // Modal B cierra (count: 1)
    expect(service.isLocked()).toBeTrue(); // Sigue bloqueado por Modal A

    service.unlock(); // Modal A cierra (count: 0)
    expect(service.isLocked()).toBeFalse(); // Ahora sí desbloqueado
  });

  it('unlock() excesivo debe ser idempotente y seguro (lockCount >= 0)', () => {
    service.unlock();
    service.unlock();
    expect(service.isLocked()).toBeFalse();

    service.lock();
    expect(service.isLocked()).toBeTrue();

    service.unlock();
    expect(service.isLocked()).toBeFalse();
  });
});
