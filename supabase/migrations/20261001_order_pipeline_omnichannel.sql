-- ======================================================================================
-- MIGRATION: 20261001_order_pipeline_omnichannel.sql
-- DESCRIPTION: Pipeline Omnicanal Unificado, Columnas Espaciales GPS, Códigos Semánticos
--              y Resolución Concurrente en Aceptación de Comandas POS.
-- AUTHOR: Senior Software Architect / Staff Engineer
-- SAFETY: Zero Downtime, Idempotente (IF NOT EXISTS), Transaccional.
-- ======================================================================================

BEGIN;

-- --------------------------------------------------------------------------------------
-- 1. ESTRUCTURA: Columnas Semánticas y Espaciales en order_requests
-- --------------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.order_requests
  ADD COLUMN IF NOT EXISTS metodo_pago_id bigint REFERENCES public.metodos_pago(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS accuracy numeric(8, 2) NULL;

COMMENT ON COLUMN public.order_requests.metodo_pago_id IS 'Método de pago seleccionado por el cliente en el Menú Público';
COMMENT ON COLUMN public.order_requests.latitude IS 'Latitud GPS capturada al momento del pedido (WGS 84)';
COMMENT ON COLUMN public.order_requests.longitude IS 'Longitud GPS capturada al momento del pedido (WGS 84)';
COMMENT ON COLUMN public.order_requests.accuracy IS 'Precisión estimada de la geolocalización en metros';

-- --------------------------------------------------------------------------------------
-- 2. ESTRUCTURA: Columnas de Comanda, Mesa y Entrega en orders
-- --------------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS numero_mesa varchar(50) NULL,
  ADD COLUMN IF NOT EXISTS direccion_entrega text NULL,
  ADD COLUMN IF NOT EXISTS latitude numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS longitude numeric(10, 7) NULL,
  ADD COLUMN IF NOT EXISTS accuracy numeric(8, 2) NULL;

COMMENT ON COLUMN public.orders.numero_mesa IS 'Número o identificador de mesa asignada al pedido';
COMMENT ON COLUMN public.orders.direccion_entrega IS 'Dirección física y referencias de entrega para pedidos a domicilio';
COMMENT ON COLUMN public.orders.latitude IS 'Latitud GPS persistida para el repartidor';
COMMENT ON COLUMN public.orders.longitude IS 'Longitud GPS persistida para el repartidor';

-- --------------------------------------------------------------------------------------
-- 3. ESTRUCTURA: Compatibilidad en Ítems y Modificadores
-- --------------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.order_items
  ADD COLUMN IF NOT EXISTS variante_id bigint NULL;

ALTER TABLE IF EXISTS public.order_item_modificadores
  ADD COLUMN IF NOT EXISTS modificador_id bigint NULL;

COMMENT ON COLUMN public.order_items.variante_id IS 'ID de variante del producto (si aplica)';
COMMENT ON COLUMN public.order_item_modificadores.modificador_id IS 'ID del modificador de producto';

-- --------------------------------------------------------------------------------------
-- 4. RENDIMIENTO: Índices Compuestos para Consulta Rápida en POS y KDS
-- --------------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_order_requests_estado_created 
  ON public.order_requests (estado, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_estado_pedido_turno 
  ON public.orders (estado_pedido, turno_id);

CREATE INDEX IF NOT EXISTS idx_orders_servicio_creacion 
  ON public.orders (tipo_servicio_id, fecha_creacion DESC);

-- --------------------------------------------------------------------------------------
-- 4. PROCEDIMIENTO TRANSACCIONAL ROBUSTO: accept_order_request
--    - Adquiere bloqueo FOR UPDATE para prevenir condiciones de carrera (doble aceptación)
--    - Propaga mesa, dirección física y telemetría GPS directamente a la orden creada
--    - Clona ítems y modificadores en una sola transacción atómica
-- --------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_order_request(
  p_request_id bigint,
  p_metodo_pago_id bigint,
  p_turno_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_req record;
  v_order_id bigint;
  v_numero_orden int;
  v_item record;
  v_new_item_id bigint;
  v_mod record;
BEGIN
  -- 1. Adquirir bloqueo exclusivo de fila (SELECT ... FOR UPDATE) para evitar race conditions
  SELECT *
  INTO v_req
  FROM public.order_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'Solicitud no encontrada con ID: ' || p_request_id
    );
  END IF;

  IF v_req.estado != 'pending' THEN
    RETURN jsonb_build_object(
      'status', 'error',
      'message', 'La solicitud ya fue procesada o cancelada previamente (estado actual: ' || v_req.estado || ')'
    );
  END IF;

  -- 2. Generar el número de orden consecutivo diario
  SELECT COALESCE(MAX(numero_orden), 0) + 1
  INTO v_numero_orden
  FROM public.orders
  WHERE fecha_creacion::date = CURRENT_DATE;

  -- 3. Crear la orden oficial transfiriendo mesa, dirección y coordenadas
  INSERT INTO public.orders (
    numero_orden,
    cliente_id,
    metodo_pago_id,
    tipo_servicio_id,
    turno_id,
    total,
    propina,
    nota_general,
    numero_mesa,
    direccion_entrega,
    latitude,
    longitude,
    accuracy,
    estado_pedido,
    estado_pago,
    fecha_creacion,
    client_request_id
  ) VALUES (
    v_numero_orden,
    v_req.cliente_id,
    p_metodo_pago_id,
    v_req.tipo_servicio_id,
    p_turno_id,
    v_req.total,
    0,
    v_req.nota_general,
    v_req.numero_mesa,
    v_req.direccion_entrega,
    v_req.latitude,
    v_req.longitude,
    v_req.accuracy,
    'pendiente',
    'pendiente',
    NOW(),
    'REQ-' || v_req.request_code
  )
  RETURNING id INTO v_order_id;

  -- 4. Clonar cada ítem de la solicitud a order_items
  FOR v_item IN 
    SELECT * FROM public.order_request_items WHERE request_id = p_request_id
  LOOP
    INSERT INTO public.order_items (
      order_id,
      producto_id,
      variante_id,
      nombre_producto,
      cantidad,
      precio_unitario,
      total,
      nota,
      estado
    ) VALUES (
      v_order_id,
      v_item.producto_id,
      v_item.variante_id,
      v_item.nombre_producto,
      v_item.cantidad,
      v_item.precio_unitario,
      v_item.total,
      v_item.nota,
      'activo'
    )
    RETURNING id INTO v_new_item_id;

    -- 5. Clonar modificadores correspondientes al ítem
    FOR v_mod IN
      SELECT * FROM public.order_request_item_modificadores WHERE request_item_id = v_item.id
    LOOP
      INSERT INTO public.order_item_modificadores (
        order_item_id,
        modificador_id,
        nombre_modificador,
        cantidad,
        precio_unitario
      ) VALUES (
        v_new_item_id,
        v_mod.modificador_id,
        v_mod.nombre_modificador,
        v_mod.cantidad,
        v_mod.precio_unitario
      );
    END LOOP;
  END LOOP;

  -- 6. Actualizar estado de la solicitud a 'accepted'
  UPDATE public.order_requests
  SET 
    estado = 'accepted',
    accepted_at = NOW(),
    metodo_pago_id = p_metodo_pago_id
  WHERE id = p_request_id;

  -- 7. Retornar confirmación estructurada
  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', v_order_id,
    'numero_orden', v_numero_orden
  );
END;
$$;

COMMIT;

-- --------------------------------------------------------------------------------------
-- ROLLBACK SCRIPT (Para emergencias, ejecutar en bloque individual si es necesario)
-- --------------------------------------------------------------------------------------
/*
BEGIN;
  DROP INDEX IF EXISTS public.idx_orders_servicio_creacion;
  DROP INDEX IF EXISTS public.idx_orders_estado_pedido_turno;
  DROP INDEX IF EXISTS public.idx_order_requests_estado_created;

  ALTER TABLE IF EXISTS public.order_items
    DROP COLUMN IF EXISTS variante_id;

  ALTER TABLE IF EXISTS public.order_item_modificadores
    DROP COLUMN IF EXISTS modificador_id;

  ALTER TABLE IF EXISTS public.orders
    DROP COLUMN IF EXISTS accuracy,
    DROP COLUMN IF EXISTS longitude,
    DROP COLUMN IF EXISTS latitude,
    DROP COLUMN IF EXISTS direccion_entrega,
    DROP COLUMN IF EXISTS numero_mesa;

  ALTER TABLE IF EXISTS public.order_requests
    DROP COLUMN IF EXISTS accuracy,
    DROP COLUMN IF EXISTS longitude,
    DROP COLUMN IF EXISTS latitude,
    DROP COLUMN IF EXISTS metodo_pago_id;
COMMIT;
*/
