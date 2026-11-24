import {
  INITIAL_MODAL_HISTORY_STATE,
  MODAL_HISTORY_BACK_TIMEOUT_MS,
  PRODUCT_DETAIL_MODAL_HISTORY_KEY,
  createModalHistoryToken,
  reduceModalHistory,
  shouldPopModalHistory,
} from './modal-history.utils';

describe('modal-history.utils (Hallazgo g: máquina pura sin historial real)', () => {
  describe('createModalHistoryToken', () => {
    it('debe generar tokens únicos con contador y timestamp sin usar crypto', () => {
      const t1 = createModalHistoryToken(1, 1700000000000);
      const t2 = createModalHistoryToken(2, 1700000000000);

      expect(t1).toBe('product-detail-1-1700000000000');
      expect(t2).toBe('product-detail-2-1700000000000');
      expect(t1).not.toBe(t2);
    });
  });

  describe('shouldPopModalHistory', () => {
    it('debe devolver true cuando el state actual corresponde al modal y coincide el token', () => {
      const state = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-123' };
      expect(shouldPopModalHistory(state, 'tok-123')).toBeTrue();
    });

    it('debe devolver false cuando no hay token pendiente (null, undefined o vacío)', () => {
      const state = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-123' };
      expect(shouldPopModalHistory(state, null)).toBeFalse();
      expect(shouldPopModalHistory(state, undefined)).toBeFalse();
      expect(shouldPopModalHistory(state, '')).toBeFalse();
    });

    it('debe devolver false cuando el state actual es null, undefined o primitivo', () => {
      expect(shouldPopModalHistory(null, 'tok-123')).toBeFalse();
      expect(shouldPopModalHistory(undefined, 'tok-123')).toBeFalse();
      expect(shouldPopModalHistory('string-state', 'tok-123')).toBeFalse();
    });

    it('debe devolver false cuando el usuario navegó a otra ruta (state de Angular sin modal)', () => {
      const routeState = { navigationId: 4 };
      expect(shouldPopModalHistory(routeState, 'tok-123')).toBeFalse();
    });

    it('debe devolver false cuando el state pertenece a otra instancia del modal (token distinto)', () => {
      const otherInstanceState = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-999' };
      expect(shouldPopModalHistory(otherInstanceState, 'tok-123')).toBeFalse();
    });

    it('debe devolver false cuando el state pertenece a otro tipo de modal aunque coincida el token', () => {
      const otherModalState = { modal: 'public-cart', token: 'tok-123' };
      expect(shouldPopModalHistory(otherModalState, 'tok-123')).toBeFalse();
    });
  });

  describe('reduceModalHistory (estado, evento) -> { estado, acciones }', () => {
    it('flujo normal: OPEN empuja estado y POPSTATE del navegador cierra el modal activo', () => {
      const open = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-A' });
      expect(open.state.activeToken).toBe('tok-A');
      expect(open.state.pushedToken).toBe('tok-A');
      expect(open.actions).toEqual([
        { type: 'PUSH_STATE', state: { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-A' } },
      ]);

      const pop = reduceModalHistory(open.state, { type: 'POPSTATE', currentState: { navigationId: 1 } });
      expect(pop.state).toEqual(INITIAL_MODAL_HISTORY_STATE);
      expect(pop.actions).toEqual([{ type: 'EMIT_CLOSE', token: 'tok-A' }]);
    });

    it('navegación a otra ruta: DESTROY no dispara HISTORY_BACK cuando currentState ya no es del modal', () => {
      const open = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-A' });
      const destroyOnRouteChange = reduceModalHistory(open.state, {
        type: 'DESTROY',
        token: 'tok-A',
        currentState: { navigationId: 5 },
      });

      expect(destroyOnRouteChange.state).toEqual(INITIAL_MODAL_HISTORY_STATE);
      expect(destroyOnRouteChange.actions).toEqual([]);
    });

    it('doble cierre de A (REQUEST_CLOSE repetido y REQUEST_CLOSE + DESTROY) no genera dos HISTORY_BACK', () => {
      const stateA = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-A' };
      const open = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-A' });

      const firstClose = reduceModalHistory(open.state, {
        type: 'REQUEST_CLOSE',
        token: 'tok-A',
        currentState: stateA,
      });
      expect(firstClose.actions).toEqual([
        { type: 'START_BACK_TIMER', ms: MODAL_HISTORY_BACK_TIMEOUT_MS },
        { type: 'HISTORY_BACK', token: 'tok-A' },
        { type: 'EMIT_CLOSE', token: 'tok-A' },
      ]);

      const secondClose = reduceModalHistory(firstClose.state, {
        type: 'REQUEST_CLOSE',
        token: 'tok-A',
        currentState: stateA,
      });
      expect(secondClose.actions).toEqual([]);
      expect(secondClose.state).toEqual(firstClose.state);

      const subsequentDestroy = reduceModalHistory(firstClose.state, {
        type: 'DESTROY',
        token: 'tok-A',
        currentState: stateA,
      });
      expect(subsequentDestroy.actions).toEqual([]);
      expect(subsequentDestroy.state).toEqual(firstClose.state);
    });

    it('doble DESTROY de A tampoco genera dos HISTORY_BACK', () => {
      const stateA = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-A' };
      const open = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-A' });

      const firstDestroy = reduceModalHistory(open.state, {
        type: 'DESTROY',
        token: 'tok-A',
        currentState: stateA,
      });
      expect(firstDestroy.actions.filter(a => a.type === 'HISTORY_BACK').length).toBe(1);

      const secondDestroy = reduceModalHistory(firstDestroy.state, {
        type: 'DESTROY',
        token: 'tok-A',
        currentState: stateA,
      });
      expect(secondDestroy.actions).toEqual([]);
    });

    it('carrera A cierra -> B abre antes de popstate: absorbe popstate de A y empuja B sin cerrar B', () => {
      const stateA = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-A' };
      const openA = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-A' });
      const destroyA = reduceModalHistory(openA.state, {
        type: 'DESTROY',
        token: 'tok-A',
        currentState: stateA,
      });
      expect(destroyA.state.pendingBackToken).toBe('tok-A');

      const openB = reduceModalHistory(destroyA.state, { type: 'OPEN', token: 'tok-B' });
      expect(openB.state.activeToken).toBe('tok-B');
      expect(openB.state.pendingPushToken).toBe('tok-B');
      expect(openB.actions).toEqual([]);

      const popFromA = reduceModalHistory(openB.state, {
        type: 'POPSTATE',
        currentState: { navigationId: 1 },
      });
      expect(popFromA.state).toEqual({
        activeToken: 'tok-B',
        pushedToken: 'tok-B',
        pendingBackToken: null,
        pendingPushToken: null,
      });
      expect(popFromA.actions).toEqual([
        { type: 'CLEAR_BACK_TIMER' },
        { type: 'PUSH_STATE', state: { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-B' } },
      ]);
    });

    it('carrera A cierra -> B abre -> C abre antes de popstate: solo queda C pendiente y la pila recibe una sola entrada', () => {
      const stateA = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-A' };
      const openA = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-A' });
      const destroyA = reduceModalHistory(openA.state, {
        type: 'DESTROY',
        token: 'tok-A',
        currentState: stateA,
      });

      const openB = reduceModalHistory(destroyA.state, { type: 'OPEN', token: 'tok-B' });
      expect(openB.actions).toEqual([]);

      const destroyB = reduceModalHistory(openB.state, {
        type: 'DESTROY',
        token: 'tok-B',
        currentState: stateA,
      });
      expect(destroyB.actions).toEqual([]);

      const openC = reduceModalHistory(destroyB.state, { type: 'OPEN', token: 'tok-C' });
      expect(openC.state.activeToken).toBe('tok-C');
      expect(openC.state.pendingPushToken).toBe('tok-C');
      expect(openC.state.pendingBackToken).toBe('tok-A');
      expect(openC.actions).toEqual([]);

      const popFromA = reduceModalHistory(openC.state, {
        type: 'POPSTATE',
        currentState: { navigationId: 1 },
      });
      expect(popFromA.state).toEqual({
        activeToken: 'tok-C',
        pushedToken: 'tok-C',
        pendingBackToken: null,
        pendingPushToken: null,
      });
      expect(popFromA.actions).toEqual([
        { type: 'CLEAR_BACK_TIMER' },
        { type: 'PUSH_STATE', state: { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-C' } },
      ]);
    });

    it('BACK_TIMEOUT libera pendingBackToken y ejecuta la apertura diferida de B', () => {
      const stateA = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-A' };
      const openA = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-A' });
      const destroyA = reduceModalHistory(openA.state, {
        type: 'DESTROY',
        token: 'tok-A',
        currentState: stateA,
      });
      const openB = reduceModalHistory(destroyA.state, { type: 'OPEN', token: 'tok-B' });

      const timedOut = reduceModalHistory(openB.state, { type: 'BACK_TIMEOUT' });
      expect(timedOut.state).toEqual({
        activeToken: 'tok-B',
        pushedToken: 'tok-B',
        pendingBackToken: null,
        pendingPushToken: null,
      });
      expect(timedOut.actions).toEqual([
        { type: 'PUSH_STATE', state: { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-B' } },
      ]);
    });

    it('POPSTATE con token de otra instancia no cambia el estado ni emite acciones', () => {
      const openB = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-B' });

      const strayPop = reduceModalHistory(openB.state, {
        type: 'POPSTATE',
        currentState: { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-A' },
      });

      expect(strayPop.state).toEqual(openB.state);
      expect(strayPop.actions).toEqual([]);
    });

    it('POPSTATE tardío de A después de BACK_TIMEOUT: si aterriza en state de A no cierra B; si aterriza en state base (sin modal) cierra B como un Atrás normal', () => {
      const stateA = { modal: PRODUCT_DETAIL_MODAL_HISTORY_KEY, token: 'tok-A' };
      const openA = reduceModalHistory(INITIAL_MODAL_HISTORY_STATE, { type: 'OPEN', token: 'tok-A' });
      const destroyA = reduceModalHistory(openA.state, {
        type: 'DESTROY',
        token: 'tok-A',
        currentState: stateA,
      });
      const openB = reduceModalHistory(destroyA.state, { type: 'OPEN', token: 'tok-B' });

      // Pasan los 400 ms: el timeout libera pendingBackToken y empuja B
      const afterTimeout = reduceModalHistory(openB.state, { type: 'BACK_TIMEOUT' });
      expect(afterTimeout.state).toEqual({
        activeToken: 'tok-B',
        pushedToken: 'tok-B',
        pendingBackToken: null,
        pendingPushToken: null,
      });

      // Sub-caso 1: back() de A corrió después del pushState(B) y retrocedió de B -> A (currentState = stateA)
      const latePopLandingOnA = reduceModalHistory(afterTimeout.state, {
        type: 'POPSTATE',
        currentState: stateA,
      });
      expect(latePopLandingOnA.state).toEqual(afterTimeout.state);
      expect(latePopLandingOnA.actions).toEqual([]);

      // Sub-caso 2 — LIMITACIÓN CONOCIDA del historial, NO comportamiento deseado:
      // Si el popstate tardío de A llega después del timeout con el state base de ruta
      // (sin token de modal), pendingBackToken ya fue liberado y la History API no permite
      // distinguirlo de un Atrás genuino del usuario sobre B, por lo que cierra B.
      const latePopLandingOnBase = reduceModalHistory(afterTimeout.state, {
        type: 'POPSTATE',
        currentState: { navigationId: 1 },
      });
      expect(latePopLandingOnBase.state).toEqual(INITIAL_MODAL_HISTORY_STATE);
      expect(latePopLandingOnBase.actions).toEqual([{ type: 'EMIT_CLOSE', token: 'tok-B' }]);
    });
  });
});
