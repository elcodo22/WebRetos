CREATE TYPE estado_reto AS ENUM ('activo', 'en_cola', 'finalizado');

ALTER TABLE retos
ADD COLUMN estado estado_reto NOT NULL DEFAULT 'en_cola',
ADD COLUMN orden_cola INTEGER;

ALTER TABLE retos
ALTER COLUMN fecha_inicio DROP NOT NULL,
ALTER COLUMN fecha_fin DROP NOT NULL;

-- Marca el reto más reciente como activo si aún no hay ninguno activo
UPDATE retos
SET estado = 'activo'
WHERE id = (
  SELECT id FROM retos
  ORDER BY creado_en DESC
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM retos WHERE estado = 'activo');

-- Asigna orden de cola a los retos en espera
WITH cola AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY creado_en) AS posicion
  FROM retos
  WHERE estado = 'en_cola'
)
UPDATE retos
SET orden_cola = cola.posicion
FROM cola
WHERE retos.id = cola.id;
