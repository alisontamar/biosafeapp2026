-- Geolocalización de alertas epidemiológicas
-- Ejecutar en Supabase SQL Editor

ALTER TABLE alertas_epidemiologicas_ia
  ADD COLUMN IF NOT EXISTS departamento text,
  ADD COLUMN IF NOT EXISTS municipio   text,
  ADD COLUMN IF NOT EXISTS enfermedad  text;

-- Índice para filtrar rápido "alertas cerca de ti" por departamento
CREATE INDEX IF NOT EXISTS idx_alertas_departamento
  ON alertas_epidemiologicas_ia (activa, departamento);
