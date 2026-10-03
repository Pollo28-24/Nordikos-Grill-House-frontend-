-- ======================================================================================
-- MIGRATION: 20261001_add_referencias_and_public_payment_methods.sql
-- DESCRIPTION: Añade columna dedicada 'referencias' en order_requests y orders,
--              habilita lectura pública RLS en metodos_pago, y actualiza accept_order_request.
-- AUTHOR: Senior Software Architect / Staff Engineer
-- SAFETY: Zero Downtime, Idempotente (IF NOT EXISTS), Transaccional.
-- ======================================================================================

BEGIN;

-- --------------------------------------------------------------------------------------
-- 1. ESTRUCTURA: Columna 'referencias' en order_requests y orders
-- --------------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.order_requests
  ADD COLUMN IF NOT EXISTS referencias text NULL;

ALTER TABLE IF EXISTS public.orders
  ADD COLUMN IF NOT EXISTS referencias text NULL;

COMMENT ON COLUMN public.order_requests.referencias IS 'Referencias o señas visuales de entrega para pedidos a domicilio';
COMMENT ON COLUMN public.orders.referencias IS 'Referencias o señas visuales de entrega persistidas en la comanda oficial';

-- --------------------------------------------------------------------------------------
-- 2. SEGURIDAD & ACCESO RLS: Permitir lectura pública de metodos_pago
--    Permite que el checkout del menú público (rol anon) pueda consultar y asociar
--    directamente el metodo_pago_id exacto sin depender de parseo de strings.
-- --------------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.metodos_pago ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-only access to metodos_pago" ON public.metodos_pago;

CREATE POLICY "Allow public read-only access to metodos_pago"
  ON public.metodos_pago
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- --------------------------------------------------------------------------------------
-- 3. PROCEDIMIENTO TRANSACCIONAL: accept_order_request actualizado
--    Copia 'referencias' directamente de order_requests a orders y propaga el metodo_pago_id
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
  v_final_metodo_pago_id bigint;
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

  -- Resolver método de pago definitivo: parámetro explícito o el preseleccionado en la solicitud
  v_final_metodo_pago_id := COALESCE(p_metodo_pago_id, v_req.metodo_pago_id);

  -- 2. Generar el número de orden consecutivo diario
  SELECT COALESCE(MAX(numero_orden), 0) + 1
  INTO v_numero_orden
  FROM public.orders
  WHERE fecha_creacion::date = CURRENT_DATE;

  -- 3. Crear la orden oficial transfiriendo mesa, dirección, referencias y coordenadas
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
    referencias,
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
    v_final_metodo_pago_id,
    v_req.tipo_servicio_id,
    p_turno_id,
    v_req.total,
    0,
    v_req.nota_general,
    v_req.numero_mesa,
    v_req.direccion_entrega,
    v_req.referencias,
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

  -- 6. Actualizar estado de la solicitud a 'accepted' y registrar timestamp y método de pago
  UPDATE public.order_requests
  SET 
    estado = 'accepted',
    accepted_at = NOW(),
    metodo_pago_id = v_final_metodo_pago_id
  WHERE id = p_request_id;

  -- 7. Retornar payload con detalles de éxito y número de orden generado
  RETURN jsonb_build_object(
    'status', 'success',
    'order_id', v_order_id,
    'numero_orden', v_numero_orden,
    'request_code', v_req.request_code
  );
END;
$$;

COMMIT;
