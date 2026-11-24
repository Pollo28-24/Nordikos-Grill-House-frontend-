import { Location } from '@angular/common';
import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProductDetailModalHistoryService } from './modal-history.service';
import {
  MODAL_HISTORY_BACK_TIMEOUT_MS,
  PRODUCT_DETAIL_MODAL_HISTORY_KEY,
} from './modal-history.utils';

describe('ProductDetailModalHistoryService (Hallazgo g: coordinador root, timeout y SSR)', () => {
  describe('en browser (sin mutar el historial real de Chrome headless)', () => {
    let service: ProductDetailModalHistoryService;
    let mockState: unknown;
    let locationMock: { getState: jasmine.Spy; back: jasmine.Spy };
    let pushStateSpy: jasmine.Spy;

    beforeEach(() => {
      jasmine.clock().install();
      mockState = { navigationId: 1 };
      locationMock = {
        getState: jasmine.createSpy('getState').and.callFake(() => mockState),
        back: jasmine.createSpy('back'),
      };
      pushStateSpy = spyOn(window.history, 'pushState').and.callFake((state: unknown) => {
        mockState = state;
      });

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          ProductDetailModalHistoryService,
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: Location, useValue: locationMock },
        ],
      });

      service = TestBed.inject(ProductDetailModalHistoryService);
    });

    afterEach(() => {
      service.ngOnDestroy();
      jasmine.clock().uninstall();
    });

    it('salida de emergencia: si el popstate de A no llega en MODAL_HISTORY_BACK_TIMEOUT_MS, libera pendingBackToken y ejecuta el pushState diferido de B', () => {
      const closeA = jasmine.createSpy('closeA');
      const closeB = jasmine.createSpy('closeB');

      const tokenA = service.open(closeA);
      expect(tokenA).toBeTruthy();
      expect(pushStateSpy).toHaveBeenCalledTimes(1);

      // A se destruye externamente mientras el historial apunta a A -> dispara back() y timer de 400ms
      service.destroy(tokenA);
      expect(locationMock.back).toHaveBeenCalledTimes(1);
      expect(service.getSnapshot().pendingBackToken).toBe(tokenA);

      // B abre antes de que llegue popstate -> su pushState queda diferido
      const tokenB = service.open(closeB);
      expect(tokenB).toBeTruthy();
      expect(pushStateSpy).toHaveBeenCalledTimes(1);
      expect(service.getSnapshot().pendingPushToken).toBe(tokenB);

      // Justo antes del timeout todavía sigue diferido
      jasmine.clock().tick(MODAL_HISTORY_BACK_TIMEOUT_MS - 1);
      expect(pushStateSpy).toHaveBeenCalledTimes(1);
      expect(service.getSnapshot().pendingBackToken).toBe(tokenA);

      // Al cumplirse MODAL_HISTORY_BACK_TIMEOUT_MS se libera y empuja B
      jasmine.clock().tick(1);
      expect(pushStateSpy).toHaveBeenCalledTimes(2);
      expect(pushStateSpy.calls.mostRecent().args[0]).toEqual({
        modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY,
        token: tokenB,
      });
      expect(service.getSnapshot()).toEqual({
        activeToken: tokenB,
        pushedToken: tokenB,
        pendingBackToken: null,
        pendingPushToken: null,
      });
      expect(closeB).not.toHaveBeenCalled();
    });
  });

  describe('en prerender / SSR (PLATFORM_ID = server)', () => {
    it('no accede a window.history ni a Location', () => {
      const locationMock = {
        getState: jasmine.createSpy('getState'),
        back: jasmine.createSpy('back'),
      };
      const pushStateSpy = spyOn(window.history, 'pushState');

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          ProductDetailModalHistoryService,
          { provide: PLATFORM_ID, useValue: 'server' },
          { provide: Location, useValue: locationMock },
        ],
      });

      const service = TestBed.inject(ProductDetailModalHistoryService);
      const closeSpy = jasmine.createSpy('close');

      const token = service.open(closeSpy);
      service.requestClose(token);
      service.destroy(token);

      expect(token).toBeNull();
      expect(pushStateSpy).not.toHaveBeenCalled();
      expect(locationMock.getState).not.toHaveBeenCalled();
      expect(locationMock.back).not.toHaveBeenCalled();
      service.ngOnDestroy();
    });
  });
});
