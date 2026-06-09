-- Tabla de alertas epidemiológicas generadas por IA (Tavily + Groq)
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS alertas_epidemiologicas_ia (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo           text NOT NULL,
  resumen          text NOT NULL,
  nivel            text NOT NULL DEFAULT 'info'
                     CHECK (nivel IN ('info', 'warning', 'critical')),
  fuente_url       text,
  activa           boolean NOT NULL DEFAULT true,
  fecha_generacion timestamptz NOT NULL DEFAULT now()
);

-- Índice para que la app solo lea las activas rápido
CREATE INDEX IF NOT EXISTS idx_alertas_activas
  ON alertas_epidemiologicas_ia (activa, fecha_generacion DESC);

-- RLS: cualquier usuario autenticado puede leer alertas activas
ALTER TABLE alertas_epidemiologicas_ia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alertas_read" ON alertas_epidemiologicas_ia;
CREATE POLICY "alertas_read"
  ON alertas_epidemiologicas_ia
  FOR SELECT
  USING (activa = true);

-- Solo el service role (Edge Function) puede insertar/actualizar
-- (no se necesita policy adicional porque service role bypassa RLS)
