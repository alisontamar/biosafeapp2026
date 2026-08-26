import { defineService } from '../_shared/handler.ts';
import { AuthError, ROLES_ADMIN, ROLES_SALUD, type Rol } from '../_shared/authContext.ts';

// Roles que un SuperAdmin puede asignar al crear personal (no se permite crear
// otro SuperAdmin desde este flujo, igual que restringía la UI original).
const ROLES_CREABLES_POR_SUPER: Rol[] = ['AdminEstablecimiento', ...ROLES_SALUD, 'Tutor_PersonaNormal'];
// Un AdminEstablecimiento solo puede crear personal de salud o tutores, para su propio establecimiento.
const ROLES_CREABLES_POR_ADMIN_EST: Rol[] = [...ROLES_SALUD, 'Tutor_PersonaNormal'];

// Carga el usuario objetivo de una acción administrativa (editar/desactivar/eliminar)
// y valida que el caller tenga permiso sobre él: SuperAdmin puede gestionar a
// cualquiera; AdminEstablecimiento solo a personal de su propio establecimiento.
// Nadie puede gestionarse a sí mismo por esta vía (evita auto-bloqueo).
async function cargarUsuarioObjetivo(admin: any, ctx: { userId: string; rol: Rol; idEstablecimiento: string | null }, id_usuario: string) {
  if (id_usuario === ctx.userId) {
    throw new AuthError('forbidden', 'No puedes realizar esta acción sobre tu propia cuenta', 403);
  }
  const { data: objetivo, error } = await admin
    .from('usuarios')
    .select('id_usuario, rol, id_establecimiento')
    .eq('id_usuario', id_usuario)
    .single();
  if (error || !objetivo) throw new AuthError('not_found', 'Usuario no encontrado', 404);

  if (ctx.rol === 'AdminEstablecimiento' && objetivo.id_establecimiento !== ctx.idEstablecimiento) {
    throw new AuthError('forbidden', 'No puedes gestionar usuarios fuera de tu establecimiento', 403);
  }
  return objetivo as { id_usuario: string; rol: Rol; id_establecimiento: string | null };
}

defineService({
  // Perfil completo del usuario autenticado.
  async obtenerPerfil(_payload, ctx, admin) {
    const { data, error } = await admin
      .from('usuarios')
      .select('*')
      .eq('id_usuario', ctx.userId)
      .single();
    if (error || !data) throw new AuthError('not_found', 'No se encontró el perfil del usuario', 404);
    return data;
  },

  // Crea la fila de perfil (rol Tutor_PersonaNormal) inmediatamente después de
  // que el usuario se registró en Supabase Auth (signUp) — RegisterScreen.
  async registrarTutor(payload, ctx, admin) {
    const { nombre_completo, correo_electronico } = payload as {
      nombre_completo?: string;
      correo_electronico?: string;
    };
    if (!nombre_completo?.trim() || !correo_electronico?.trim()) {
      throw new AuthError('invalid_payload', 'Faltan datos del tutor (nombre o correo)', 400);
    }

    const { data, error } = await admin
      .from('usuarios')
      .insert([{
        id_usuario: ctx.userId,
        nombre_completo: nombre_completo.trim(),
        correo_electronico: correo_electronico.trim().toLowerCase(),
        password_hash: '',
        rol: 'Tutor_PersonaNormal',
        tiene_hijos: true,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Un admin da de alta el perfil de un usuario de personal/staff/tutor cuya
  // cuenta de Auth ya fue creada por CreateUserScreen (con un cliente temporal
  // para no cerrar la sesión del admin). Requiere el id_usuario ya generado.
  async crearUsuarioStaff(payload, ctx, admin) {
    if (!ROLES_ADMIN.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo administradores pueden crear usuarios', 403);
    }

    const { id_usuario, nombre_completo, correo_electronico, rol, id_establecimiento } = payload as {
      id_usuario?: string;
      nombre_completo?: string;
      correo_electronico?: string;
      rol?: Rol;
      id_establecimiento?: string | null;
    };
    if (!id_usuario || !nombre_completo?.trim() || !correo_electronico?.trim() || !rol) {
      throw new AuthError('invalid_payload', 'Faltan datos del usuario a crear', 400);
    }

    const rolesPermitidos = ctx.rol === 'SuperAdmin' ? ROLES_CREABLES_POR_SUPER : ROLES_CREABLES_POR_ADMIN_EST;
    if (!rolesPermitidos.includes(rol)) {
      throw new AuthError('forbidden', `Tu rol no puede crear usuarios con rol "${rol}"`, 403);
    }

    const esTutor = rol === 'Tutor_PersonaNormal';
    // Un AdminEstablecimiento solo puede asignar personal a su propio establecimiento,
    // sin importar lo que venga en el payload.
    const establecimientoFinal = esTutor
      ? null
      : ctx.rol === 'AdminEstablecimiento' ? ctx.idEstablecimiento : (id_establecimiento ?? null);

    if (!esTutor && !establecimientoFinal) {
      throw new AuthError('invalid_payload', 'Falta el establecimiento para este usuario', 400);
    }

    const { data, error } = await admin
      .from('usuarios')
      .insert([{
        id_usuario,
        nombre_completo: nombre_completo.trim(),
        correo_electronico: correo_electronico.trim().toLowerCase(),
        rol,
        id_establecimiento: establecimientoFinal,
        password_hash: '',
        tiene_hijos: esTutor,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Lista de usuarios visibles para el caller: SuperAdmin ve todos (con el
  // nombre de su establecimiento), AdminEstablecimiento solo los de su propio
  // establecimiento. Cualquier otro rol no tiene acceso.
  async listarUsuarios(_payload, ctx, admin) {
    if (!ROLES_ADMIN.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'No tienes acceso a la lista de usuarios', 403);
    }
    let query = admin
      .from('usuarios')
      .select('id_usuario, nombre_completo, correo_electronico, rol, activo, fecha_registro, establecimientos(nombre_establecimiento)')
      .order('fecha_registro', { ascending: false });

    if (ctx.rol === 'AdminEstablecimiento') {
      if (!ctx.idEstablecimiento) return [];
      query = query.eq('id_establecimiento', ctx.idEstablecimiento);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  // Conteo de usuarios, ya escopado por el rol del caller — el mismo shape
  // sirve tanto para "usuarios totales" (SuperAdmin) como "personal asignado"
  // (AdminEstablecimiento), sin que el cliente tenga que decidir el filtro.
  async contarUsuarios(_payload, ctx, admin) {
    if (!ROLES_ADMIN.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'No tienes acceso a este conteo', 403);
    }
    let query = admin.from('usuarios').select('id_usuario', { count: 'exact', head: true });
    if (ctx.rol === 'AdminEstablecimiento') {
      if (!ctx.idEstablecimiento) return { total: 0 };
      query = query.eq('id_establecimiento', ctx.idEstablecimiento);
    }
    const { count, error } = await query;
    if (error) throw error;
    return { total: count ?? 0 };
  },

  // Actualiza campos propios y no sensibles del perfil del caller (whitelist).
  async actualizarPerfil(payload, ctx, admin) {
    const { tiene_hijos, nombre_completo } = payload as { tiene_hijos?: boolean; nombre_completo?: string };
    const cambios: Record<string, unknown> = {};
    if (typeof tiene_hijos === 'boolean') cambios.tiene_hijos = tiene_hijos;
    if (typeof nombre_completo === 'string' && nombre_completo.trim()) cambios.nombre_completo = nombre_completo.trim();

    if (Object.keys(cambios).length === 0) {
      throw new AuthError('invalid_payload', 'No hay campos válidos para actualizar', 400);
    }

    const { data, error } = await admin
      .from('usuarios')
      .update(cambios)
      .eq('id_usuario', ctx.userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Un admin edita nombre/rol/establecimiento de otro usuario (UserManagementScreen).
  async actualizarUsuario(payload, ctx, admin) {
    if (!ROLES_ADMIN.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo administradores pueden editar usuarios', 403);
    }
    const { id_usuario, nombre_completo, rol, id_establecimiento } = payload as {
      id_usuario?: string;
      nombre_completo?: string;
      rol?: Rol;
      id_establecimiento?: string | null;
    };
    if (!id_usuario) throw new AuthError('invalid_payload', 'Falta id_usuario', 400);

    const objetivo = await cargarUsuarioObjetivo(admin, ctx, id_usuario);

    const cambios: Record<string, unknown> = {};
    if (typeof nombre_completo === 'string' && nombre_completo.trim()) {
      cambios.nombre_completo = nombre_completo.trim();
    }
    if (rol && rol !== objetivo.rol) {
      const rolesPermitidos = ctx.rol === 'SuperAdmin' ? ROLES_CREABLES_POR_SUPER : ROLES_CREABLES_POR_ADMIN_EST;
      if (!rolesPermitidos.includes(rol)) {
        throw new AuthError('forbidden', `Tu rol no puede asignar el rol "${rol}"`, 403);
      }
      cambios.rol = rol;
      cambios.id_establecimiento = rol === 'Tutor_PersonaNormal'
        ? null
        : ctx.rol === 'AdminEstablecimiento' ? ctx.idEstablecimiento : (id_establecimiento ?? objetivo.id_establecimiento);
    } else if (id_establecimiento !== undefined && objetivo.rol !== 'Tutor_PersonaNormal') {
      cambios.id_establecimiento = ctx.rol === 'AdminEstablecimiento' ? ctx.idEstablecimiento : id_establecimiento;
    }

    if (Object.keys(cambios).length === 0) {
      throw new AuthError('invalid_payload', 'No hay campos válidos para actualizar', 400);
    }

    const { data, error } = await admin
      .from('usuarios')
      .update(cambios)
      .eq('id_usuario', id_usuario)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Activa/desactiva la cuenta de otro usuario — bloquea su acceso a todos
  // los microservicios sin borrar sus datos ni su historial.
  async cambiarEstadoUsuario(payload, ctx, admin) {
    if (!ROLES_ADMIN.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo administradores pueden activar/desactivar usuarios', 403);
    }
    const { id_usuario, activo } = payload as { id_usuario?: string; activo?: boolean };
    if (!id_usuario || typeof activo !== 'boolean') {
      throw new AuthError('invalid_payload', 'Faltan id_usuario o activo', 400);
    }

    const objetivo = await cargarUsuarioObjetivo(admin, ctx, id_usuario);
    if (objetivo.rol === 'SuperAdmin') {
      throw new AuthError('forbidden', 'No se puede desactivar a un SuperAdmin', 403);
    }

    const { data, error } = await admin
      .from('usuarios')
      .update({ activo })
      .eq('id_usuario', id_usuario)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Elimina definitivamente la cuenta (perfil + Auth) de un usuario de personal/admin.
  // No se permite eliminar tutores: sus pacientes quedarían huérfanos
  // (pacientes.id_tutor_registro pasa a NULL) — para tutores, usar cambiarEstadoUsuario.
  async eliminarUsuario(payload, ctx, admin) {
    if (!ROLES_ADMIN.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo administradores pueden eliminar usuarios', 403);
    }
    const { id_usuario } = payload as { id_usuario?: string };
    if (!id_usuario) throw new AuthError('invalid_payload', 'Falta id_usuario', 400);

    const objetivo = await cargarUsuarioObjetivo(admin, ctx, id_usuario);
    if (objetivo.rol === 'Tutor_PersonaNormal') {
      throw new AuthError(
        'forbidden',
        'No se puede eliminar a un padre/tutor (sus hijos quedarían sin dueño). Desactívalo en su lugar.',
        403,
      );
    }
    if (objetivo.rol === 'SuperAdmin') {
      throw new AuthError('forbidden', 'No se puede eliminar a un SuperAdmin', 403);
    }

    const { error: deleteRowError } = await admin.from('usuarios').delete().eq('id_usuario', id_usuario);
    if (deleteRowError) throw deleteRowError;

    // Borra también la cuenta de Supabase Auth para que no pueda volver a iniciar sesión.
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id_usuario);
    if (deleteAuthError) {
      console.error('No se pudo borrar el usuario de Auth (el perfil ya se borró):', deleteAuthError);
    }

    return { eliminado: true };
  },
});
