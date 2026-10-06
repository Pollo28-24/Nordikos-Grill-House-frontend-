-- ======================================================================================
-- MIGRATION: 20261005_add_rules_to_modificador_categorias.sql
-- DESCRIPTION: Agrega columnas nativas de reglas de negocio a 'modificador_categorias':
--              tipo_seleccion ('RADIO', 'CHECKBOX', 'STEPPER'), min_selections,
--              max_selections, obligatorio y orden_visual.
-- AUTHOR: Senior Software Architect / Staff Engineer
-- SAFETY: Idempotente (IF NOT EXISTS), Transaccional, Zero-Downtime con defaults seguros.
-- ======================================================================================

BEGIN;

-- 1. Agregar columnas de reglas con defaults compatibles
ALTER TABLE IF EXISTS public.modificador_categorias
  ADD COLUMN IF NOT EXISTS tipo_seleccion varchar(20) NOT NULL DEFAULT 'CHECKBOX',
  ADD COLUMN IF NOT EXISTS min_selections int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_selections int NOT NULL DEFAULT 99,
  ADD COLUMN IF NOT EXISTS obligatorio boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS orden_visual int NOT NULL DEFAULT 10;

-- 2. Asegurar restricción de valores permitidos para tipo_seleccion
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_modificador_categorias_tipo_seleccion'
  ) THEN
    ALTER TABLE public.modificador_categorias
      ADD CONSTRAINT chk_modificador_categorias_tipo_seleccion
      CHECK (tipo_seleccion IN ('RADIO', 'CHECKBOX', 'STEPPER'));
  END IF;
END $$;

-- 3. Migrar datos existentes en base a reglas canónicas gastronómicas
-- A. Término de cocción (Obligatorio, opción única)
UPDATE public.modificador_categorias
SET 
  tipo_seleccion = 'RADIO',
  min_selections = 1,
  max_selections = 1,
  obligatorio = true,
  orden_visual = 1
WHERE lower(nombre) ~* '(termino|coccion)';

-- B. Proteína (Obligatorio, opción única si aplica)
UPDATE public.modificador_categorias
SET 
  tipo_seleccion = 'RADIO',
  min_selections = 1,
  max_selections = 1,
  obligatorio = true,
  orden_visual = 2
WHERE lower(nombre) ~* 'proteina';

-- C. Quesos (Opcional, selección múltiple hasta 5)
UPDATE public.modificador_categorias
SET 
  tipo_seleccion = 'CHECKBOX',
  min_selections = 0,
  max_selections = 5,
  obligatorio = false,
  orden_visual = 3
WHERE lower(nombre) ~* 'queso';

-- D. Salsas y Aderezos (Opcional, selección múltiple hasta 4)
UPDATE public.modificador_categorias
SET 
  tipo_seleccion = 'CHECKBOX',
  min_selections = 0,
  max_selections = 4,
  obligatorio = false,
  orden_visual = 4
WHERE lower(nombre) ~* '(salsa|aderezo)';

-- E. Extras y Agregados (Contador Stepper)
UPDATE public.modificador_categorias
SET 
  tipo_seleccion = 'STEPPER',
  min_selections = 0,
  max_selections = 99,
  obligatorio = false,
  orden_visual = 5
WHERE lower(nombre) ~* '(extra|agregado)';

-- F. Quitar ingredientes / Sin ingredientes (Checkboxes)
UPDATE public.modificador_categorias
SET 
  tipo_seleccion = 'CHECKBOX',
  min_selections = 0,
  max_selections = 99,
  obligatorio = false,
  orden_visual = 6
WHERE lower(nombre) ~* '(sin|quitar)';

-- 4. Documentación de columnas
COMMENT ON COLUMN public.modificador_categorias.tipo_seleccion IS 'Tipo de control visual en menú y POS: RADIO (exclusivo 1), CHECKBOX (múltiple sí/no) o STEPPER (contador numérico).';
COMMENT ON COLUMN public.modificador_categorias.min_selections IS 'Cantidad mínima requerida de selecciones para que el producto sea válido al agregar al carrito.';
COMMENT ON COLUMN public.modificador_categorias.max_selections IS 'Cantidad máxima de selecciones permitidas dentro de este grupo.';
COMMENT ON COLUMN public.modificador_categorias.obligatorio IS 'Si es true, el cliente o cajero debe seleccionar al menos min_selections antes de confirmar el producto.';
COMMENT ON COLUMN public.modificador_categorias.orden_visual IS 'Posición y ordenamiento secuencial en el modal de personalización.';

COMMIT;
