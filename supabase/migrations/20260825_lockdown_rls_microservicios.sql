-- Fase 7 de la migración a microservicios (ver docs/ARQUITECTURA_MICROSERVICIOS.md).
-- Cierre de seguridad: revoca el acceso directo de anon/authenticated a las
-- tablas de negocio y activa RLS sin políticas (deny por defecto).
--
-- Contexto: hasta ahora estas tablas tenían RLS deshabilitado y grants
-- completos (INSERT/SELECT/UPDATE/DELETE/TRUNCATE) para anon y authenticated
-- — cualquiera con la anon key podía leer o borrar los datos directo por
-- REST, sin pasar por la app. Ya no hace falta: toda la app pasa por los
-- microservicios (Edge Functions), que usan el cliente service_role y
-- bypassan RLS. RLS queda como defensa en profundidad (si alguien filtra la
-- anon key, no puede tocar estas tablas).
--
-- Ejecutar en Supabase SQL Editor (o supabase db query --linked -f).

revoke all on table public.usuarios from anon, authenticated;
revoke all on table public.establecimientos from anon, authenticated;
revoke all on table public.pacientes from anon, authenticated;
revoke all on table public.dosis_aplicadas from anon, authenticated;
revoke all on table public.cat_vacunas_oficiales from anon, authenticated;
revoke all on table public.cartillas_fisicas_imagenes from anon, authenticated;
revoke all on table public.alertas_epidemiologicas_ia from anon, authenticated;

alter table public.usuarios enable row level security;
alter table public.establecimientos enable row level security;
alter table public.pacientes enable row level security;
alter table public.dosis_aplicadas enable row level security;
alter table public.cat_vacunas_oficiales enable row level security;
alter table public.cartillas_fisicas_imagenes enable row level security;
-- alertas_epidemiologicas_ia ya tenía RLS activo (policy "alertas_read");
-- ahora que la lectura también pasa por alertas-service, se le quita la
-- policy pública para que quede deny-by-default como el resto.
drop policy if exists "alertas_read" on public.alertas_epidemiologicas_ia;
