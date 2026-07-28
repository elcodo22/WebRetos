-- Tabla obras (vídeos subidos a Cloudflare Stream)
-- Ejecuta solo si aún no creaste la tabla obras en Supabase

DO $$ BEGIN
  CREATE TYPE estado_obra AS ENUM (
    'pendiente',
    'aprobado',
    'rechazado',
    'cuarentena'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS obras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_reto UUID NOT NULL REFERENCES retos(id) ON DELETE CASCADE,
  id_usuario UUID NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  id_cloudflare TEXT NOT NULL,
  estado estado_obra NOT NULL DEFAULT 'pendiente',
  comprobado BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT obras_usuario_reto_unico UNIQUE (id_reto, id_usuario)
);

ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Ver obras propias siempre"
    ON obras FOR SELECT
    USING (auth.uid() = id_usuario);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Ver obras públicas cuando el reto ha terminado"
    ON obras FOR SELECT
    USING (
      estado = 'aprobado'
      AND EXISTS (
        SELECT 1 FROM retos
        WHERE retos.id = obras.id_reto
          AND retos.fecha_fin <= NOW()
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Usuarios autenticados suben obras"
    ON obras FOR INSERT
    WITH CHECK (auth.uid() = id_usuario);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Usuarios actualizan sus obras pendientes"
    ON obras FOR UPDATE
    USING (auth.uid() = id_usuario AND estado = 'pendiente');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins gestionan todas las obras"
    ON obras FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM perfiles
        WHERE id = auth.uid() AND es_admin = true
      )
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
