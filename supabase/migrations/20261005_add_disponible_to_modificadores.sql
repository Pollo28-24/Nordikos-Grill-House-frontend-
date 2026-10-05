-- ==============================================================================
-- Migración: Separación de responsabilidades de modificadores (disponible vs visible)
-- ==============================================================================

-- 1. Agregar columna 'disponible' con default true
ALTER TABLE modificadores
  ADD COLUMN IF NOT EXISTS disponible boolean NOT NULL DEFAULT true;

-- 2. Preservar estado operativo actual:
-- Lo que hoy estaba apagado (visible = false) debe seguir apagado en el POS (disponible = false)
UPDATE modificadores
  SET disponible = visible;

-- 3. Documentación de columnas
COMMENT ON COLUMN modificadores.disponible IS 'Habilita la venta operativa en POS/Cocina. Si es false, el modificador está agotado o fuera de servicio.';
COMMENT ON COLUMN modificadores.visible IS 'Controla la exhibición en el Menú Digital Público. Si es false, permanece oculto a los clientes pero puede ser vendido internamente en POS si disponible = true.';
