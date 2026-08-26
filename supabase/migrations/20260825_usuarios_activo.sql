-- Soporte para desactivar usuarios sin borrarlos (usuarios-service.cambiarEstadoUsuario).
-- Un usuario con activo=false no puede usar ningún microservicio: getAuthContext
-- lo rechaza en el primer paso, antes de llegar a cualquier acción.
alter table public.usuarios add column if not exists activo boolean not null default true;
