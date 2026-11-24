export const PRODUCT_DETAIL_MODAL_HISTORY_KEY = 'product-detail' as const;
export const MODAL_HISTORY_BACK_TIMEOUT_MS = 400;

export interface ProductDetailModalHistoryState {
  readonly modal: typeof PRODUCT_DETAIL_MODAL_HISTORY_KEY;
  readonly token: string;
}

export interface ModalHistoryMachineState {
  readonly activeToken: string | null;
  readonly pushedToken: string | null;
  readonly pendingBackToken: string | null;
  readonly pendingPushToken: string | null;
}

export const INITIAL_MODAL_HISTORY_STATE: ModalHistoryMachineState = {
  activeToken: null,
  pushedToken: null,
  pendingBackToken: null,
  pendingPushToken: null,
};

export type ModalHistoryEvent =
  | { readonly type: 'OPEN'; readonly token: string }
  | { readonly type: 'REQUEST_CLOSE'; readonly token: string; readonly currentState: unknown }
  | { readonly type: 'DESTROY'; readonly token: string; readonly currentState: unknown }
  | { readonly type: 'POPSTATE'; readonly currentState: unknown }
  | { readonly type: 'BACK_TIMEOUT' };

export type ModalHistoryAction =
  | { readonly type: 'PUSH_STATE'; readonly state: ProductDetailModalHistoryState }
  | { readonly type: 'HISTORY_BACK'; readonly token: string }
  | { readonly type: 'EMIT_CLOSE'; readonly token: string }
  | { readonly type: 'START_BACK_TIMER'; readonly ms: number }
  | { readonly type: 'CLEAR_BACK_TIMER' };

export interface ModalHistoryTransition {
  readonly state: ModalHistoryMachineState;
  readonly actions: readonly ModalHistoryAction[];
}

/**
 * Genera un token único determinista para cada instancia del modal
 * usando contador monotónico + timestamp, sin depender de crypto.randomUUID.
 */
export function createModalHistoryToken(seq: number, timestamp: number): string {
  return `${PRODUCT_DETAIL_MODAL_HISTORY_KEY}-${seq}-${timestamp}`;
}

export function isProductDetailModalHistoryState(
  value: unknown
): value is ProductDetailModalHistoryState {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    candidate['modal'] === PRODUCT_DETAIL_MODAL_HISTORY_KEY &&
    typeof candidate['token'] === 'string' &&
    candidate['token'].length > 0
  );
}

/**
 * Decide si corresponde invocar history.back() al cerrar o destruir ProductDetailModal.
 * Solo devuelve true si el token existe y el state actual del historial pertenece
 * exactamente a esta instancia del modal.
 */
export function shouldPopModalHistory(
  currentState: unknown,
  token: string | null | undefined
): boolean {
  if (!token) {
    return false;
  }
  return (
    isProductDetailModalHistoryState(currentState) &&
    currentState.token === token
  );
}

function buildModalState(token: string): ProductDetailModalHistoryState {
  return {
    modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY,
    token,
  };
}

/**
 * Máquina de estados pura (estado, evento) -> { estado, acciones }
 * para coordinar el historial de ProductDetailModal sin efectos secundarios.
 */
export function reduceModalHistory(
  state: ModalHistoryMachineState,
  event: ModalHistoryEvent
): ModalHistoryTransition {
  switch (event.type) {
    case 'OPEN': {
      // Si hay un history.back() pendiente de un modal anterior, diferimos el pushState
      // manteniendo únicamente la apertura más reciente (A cierra -> B abre -> C abre => solo C).
      if (state.pendingBackToken !== null) {
        return {
          state: {
            ...state,
            activeToken: event.token,
            pendingPushToken: event.token,
          },
          actions: [],
        };
      }

      return {
        state: {
          activeToken: event.token,
          pushedToken: event.token,
          pendingBackToken: null,
          pendingPushToken: null,
        },
        actions: [{ type: 'PUSH_STATE', state: buildModalState(event.token) }],
      };
    }

    case 'REQUEST_CLOSE': {
      // Doble cierre o cierre de una instancia ya reemplazada: no-op.
      if (state.activeToken !== event.token) {
        return { state, actions: [] };
      }

      // Si el modal nunca alcanzó a empujar su entrada (estaba diferido), cerramos sin llamar back().
      if (state.pendingPushToken === event.token) {
        return {
          state: {
            ...state,
            activeToken: null,
            pendingPushToken: null,
          },
          actions: [{ type: 'EMIT_CLOSE', token: event.token }],
        };
      }

      // Si la entrada activa del navegador es esta instancia, disparamos back() + temporizador de emergencia.
      if (
        state.pushedToken === event.token &&
        shouldPopModalHistory(event.currentState, event.token)
      ) {
        return {
          state: {
            activeToken: null,
            pushedToken: null,
            pendingBackToken: event.token,
            pendingPushToken: null,
          },
          actions: [
            { type: 'START_BACK_TIMER', ms: MODAL_HISTORY_BACK_TIMEOUT_MS },
            { type: 'HISTORY_BACK', token: event.token },
            { type: 'EMIT_CLOSE', token: event.token },
          ],
        };
      }

      // El historial ya no apunta a esta instancia: cerramos el modal sin llamar back().
      return {
        state: {
          ...state,
          activeToken: null,
          pushedToken: state.pushedToken === event.token ? null : state.pushedToken,
        },
        actions: [{ type: 'EMIT_CLOSE', token: event.token }],
      };
    }

    case 'DESTROY': {
      const ownsActive = state.activeToken === event.token;
      const ownsPushed = state.pushedToken === event.token;
      const ownsPendingPush = state.pendingPushToken === event.token;

      // Ya se cerró previamente (ej. tras REQUEST_CLOSE o POPSTATE) o fue reemplazado: no-op.
      if (!ownsActive && !ownsPushed && !ownsPendingPush) {
        return { state, actions: [] };
      }

      // Si era una apertura diferida que se destruyó antes de llegar el popstate: limpiar sin back().
      if (ownsPendingPush) {
        return {
          state: {
            ...state,
            activeToken: ownsActive ? null : state.activeToken,
            pendingPushToken: null,
          },
          actions: [],
        };
      }

      // Cierre externo mientras el historial sigue en la entrada de esta instancia: hacer back().
      if (ownsPushed && shouldPopModalHistory(event.currentState, event.token)) {
        return {
          state: {
            activeToken: ownsActive ? null : state.activeToken,
            pushedToken: null,
            pendingBackToken: event.token,
            pendingPushToken: null,
          },
          actions: [
            { type: 'START_BACK_TIMER', ms: MODAL_HISTORY_BACK_TIMEOUT_MS },
            { type: 'HISTORY_BACK', token: event.token },
          ],
        };
      }

      // Cierre externo tras navegación a otra ruta: limpiar estado sin invocar history.back().
      return {
        state: {
          ...state,
          activeToken: ownsActive ? null : state.activeToken,
          pushedToken: ownsPushed ? null : state.pushedToken,
        },
        actions: [],
      };
    }

    case 'POPSTATE': {
      // 1) Había un back() en vuelo de un modal previo: absorber este popstate.
      if (state.pendingBackToken !== null) {
        if (state.pendingPushToken !== null) {
          const nextToken = state.pendingPushToken;
          return {
            state: {
              activeToken: nextToken,
              pushedToken: nextToken,
              pendingBackToken: null,
              pendingPushToken: null,
            },
            actions: [
              { type: 'CLEAR_BACK_TIMER' },
              { type: 'PUSH_STATE', state: buildModalState(nextToken) },
            ],
          };
        }

        return {
          state: {
            ...state,
            pendingBackToken: null,
          },
          actions: [{ type: 'CLEAR_BACK_TIMER' }],
        };
      }

      // 2) Sin back() pendiente y sin modal activo: nada que hacer.
      if (state.activeToken === null) {
        return { state, actions: [] };
      }

      // 3) Si el popstate trae el token de esta u otra instancia del modal, NO cambiar estado.
      if (isProductDetailModalHistoryState(event.currentState)) {
        return { state, actions: [] };
      }

      // 4) El usuario retrocedió fuera de la entrada del modal: cerrar modal activo.
      const closingToken = state.activeToken;
      return {
        state: {
          activeToken: null,
          pushedToken: null,
          pendingBackToken: null,
          pendingPushToken: null,
        },
        actions: [{ type: 'EMIT_CLOSE', token: closingToken }],
      };
    }

    case 'BACK_TIMEOUT': {
      if (state.pendingBackToken === null) {
        return { state, actions: [] };
      }

      // Salida de emergencia: liberar pendingBackToken y ejecutar pushState diferido si existe.
      if (state.pendingPushToken !== null) {
        const nextToken = state.pendingPushToken;
        return {
          state: {
            activeToken: nextToken,
            pushedToken: nextToken,
            pendingBackToken: null,
            pendingPushToken: null,
          },
          actions: [{ type: 'PUSH_STATE', state: buildModalState(nextToken) }],
        };
      }

      return {
        state: {
          ...state,
          pendingBackToken: null,
        },
        actions: [],
      };
    }
  }
}
