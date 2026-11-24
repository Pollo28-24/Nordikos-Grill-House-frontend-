import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { Location, isPlatformBrowser } from '@angular/common';
import {
  INITIAL_MODAL_HISTORY_STATE,
  ModalHistoryAction,
  ModalHistoryEvent,
  ModalHistoryMachineState,
  ProductDetailModalHistoryState,
  createModalHistoryToken,
  reduceModalHistory,
} from './modal-history.utils';

/**
 * Coordinador global (providedIn: 'root') del historial del navegador
 * para instancias sucesivas de ProductDetailModal.
 * Delega toda la lógica de decisión a la máquina pura reduceModalHistory
 * y solo ejecuta efectos en entorno browser (cero acceso a window/history en SSR).
 */
@Injectable({ providedIn: 'root' })
export class ProductDetailModalHistoryService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly location = inject(Location);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private state: ModalHistoryMachineState = INITIAL_MODAL_HISTORY_STATE;
  private seq = 0;
  private backTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly closeCallbacks = new Map<string, () => void>();
  private popStateBound = false;

  private readonly handleWindowPopState = (): void => {
    if (!this.isBrowser) return;
    this.dispatch({
      type: 'POPSTATE',
      currentState: this.location.getState(),
    });
  };

  open(onClose: () => void): string | null {
    if (!this.isBrowser) {
      return null;
    }

    this.ensurePopStateListener();

    const token = createModalHistoryToken(++this.seq, Date.now());
    this.closeCallbacks.set(token, onClose);
    this.dispatch({ type: 'OPEN', token });
    return token;
  }

  requestClose(token: string | null): void {
    if (!this.isBrowser || !token) {
      return;
    }

    this.dispatch({
      type: 'REQUEST_CLOSE',
      token,
      currentState: this.location.getState(),
    });
  }

  destroy(token: string | null): void {
    if (!this.isBrowser || !token) {
      return;
    }

    this.closeCallbacks.delete(token);
    this.dispatch({
      type: 'DESTROY',
      token,
      currentState: this.location.getState(),
    });
  }

  getSnapshot(): ModalHistoryMachineState {
    return this.state;
  }

  ngOnDestroy(): void {
    this.clearBackTimer();
    this.closeCallbacks.clear();
    if (this.isBrowser && this.popStateBound) {
      window.removeEventListener('popstate', this.handleWindowPopState);
      this.popStateBound = false;
    }
  }

  private ensurePopStateListener(): void {
    if (this.isBrowser && !this.popStateBound) {
      window.addEventListener('popstate', this.handleWindowPopState);
      this.popStateBound = true;
    }
  }

  private dispatch(event: ModalHistoryEvent): void {
    const transition = reduceModalHistory(this.state, event);
    this.state = transition.state;
    this.executeActions(transition.actions);
  }

  private executeActions(actions: readonly ModalHistoryAction[]): void {
    for (const action of actions) {
      switch (action.type) {
        case 'PUSH_STATE':
          this.pushHistoryState(action.state);
          break;
        case 'HISTORY_BACK':
          this.location.back();
          break;
        case 'START_BACK_TIMER':
          this.startBackTimer(action.ms);
          break;
        case 'CLEAR_BACK_TIMER':
          this.clearBackTimer();
          break;
        case 'EMIT_CLOSE': {
          const cb = this.closeCallbacks.get(action.token);
          this.closeCallbacks.delete(action.token);
          cb?.();
          break;
        }
      }
    }
  }

  private pushHistoryState(state: ProductDetailModalHistoryState): void {
    if (!this.isBrowser) return;
    window.history.pushState(state, '');
  }

  private startBackTimer(ms: number): void {
    this.clearBackTimer();
    this.backTimer = setTimeout(() => {
      this.backTimer = null;
      this.dispatch({ type: 'BACK_TIMEOUT' });
    }, ms);
  }

  private clearBackTimer(): void {
    if (this.backTimer !== null) {
      clearTimeout(this.backTimer);
      this.backTimer = null;
    }
  }
}
