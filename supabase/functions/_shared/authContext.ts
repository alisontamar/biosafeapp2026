import type { AdminClient } from './supabaseAdmin.ts';

export type Rol =
  | 'SuperAdmin'
  | 'AdminEstablecimiento'
  | 'Medico'
  | 'Enfermero'
  | 'Farmaceutico'
  | 'Tutor_PersonaNormal';

export const ROLES_SALUD: Rol[] = ['Medico', 'Enfermero', 'Farmaceutico'];
export const ROLES_ADMIN: Rol[] = ['SuperAdmin', 'AdminEstablecimiento'];
export const ROLES_STAFF: Rol[] = [...ROLES_SALUD, ...ROLES_ADMIN];

export type AuthContext = {
  userId: string;
  rol: Rol;
  idEstablecimiento: string | null;
};

export class AuthError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 401) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Valida el JWT del header Authorization contra Supabase Auth y carga el
// perfil (rol, establecimiento) desde la tabla `usuarios`. Cada Edge Function
// llama esto como primer paso — es la autoridad de autenticación/autorización
// del microservicio, RLS queda solo como respaldo (ver docs/ARQUITECTURA_MICROSERVICIOS.md).
export async function getAuthContext(req: Request, admin: AdminClient): Promise<AuthContext> {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new AuthError('unauthorized', 'Falta el token de autenticación', 401);

  const { data: { user }, error: userError } = await admin.auth.getUser(token);
  if (userError || !user) throw new AuthError('unauthorized', 'Sesión inválida o expirada', 401);

  const { data: perfil, error: perfilError } = await admin
    .from('usuarios')
    .select('rol, id_establecimiento, activo')
    .eq('id_usuario', user.id)
    .single();

  if (perfilError || !perfil) {
    throw new AuthError('profile_not_found', 'No se encontró el perfil del usuario', 404);
  }

  if (perfil.activo === false) {
    throw new AuthError('account_disabled', 'Tu cuenta ha sido desactivada. Contacta a tu administrador.', 403);
  }

  return {
    userId: user.id,
    rol: perfil.rol as Rol,
    idEstablecimiento: perfil.id_establecimiento as string | null,
  };
}

export function requireRole(ctx: AuthContext, roles: Rol[]) {
  if (!roles.includes(ctx.rol)) {
    throw new AuthError('forbidden', `Tu rol (${ctx.rol}) no está autorizado para esta acción`, 403);
  }
}
