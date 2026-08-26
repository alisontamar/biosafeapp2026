import { defineService } from '../_shared/handler.ts';
import { AuthError } from '../_shared/authContext.ts';

defineService({
  // Solo SuperAdmin puede crear centros de salud/farmacias.
  async crear(payload, ctx, admin) {
    if (ctx.rol !== 'SuperAdmin') {
      throw new AuthError('forbidden', 'Solo el SuperAdmin puede crear establecimientos', 403);
    }
    const { nombre_establecimiento, ciudad_municipio, tipo } = payload as {
      nombre_establecimiento?: string;
      ciudad_municipio?: string;
      tipo?: 'Centro de Salud' | 'Farmacia';
    };
    if (!nombre_establecimiento?.trim() || !ciudad_municipio?.trim() || !tipo) {
      throw new AuthError('invalid_payload', 'Faltan datos del establecimiento', 400);
    }

    const { data, error } = await admin
      .from('establecimientos')
      .insert([{
        nombre_establecimiento: nombre_establecimiento.trim(),
        ciudad_municipio: ciudad_municipio.trim(),
        tipo,
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Lista completa de establecimientos — solo SuperAdmin (AdminEstablecimiento
  // usa obtenerPorId para ver el suyo).
  async listar(_payload, ctx, admin) {
    if (ctx.rol !== 'SuperAdmin') {
      throw new AuthError('forbidden', 'Solo el SuperAdmin puede listar todos los establecimientos', 403);
    }
    const { data, error } = await admin
      .from('establecimientos')
      .select('*')
      .order('fecha_registro', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // Detalle de un establecimiento. SuperAdmin puede pedir cualquiera; el resto
  // de roles solo puede pedir el suyo propio (ctx.idEstablecimiento).
  async obtenerPorId(payload, ctx, admin) {
    const { id_establecimiento } = payload as { id_establecimiento?: string };
    if (!id_establecimiento) throw new AuthError('invalid_payload', 'Falta id_establecimiento', 400);

    if (ctx.rol !== 'SuperAdmin' && ctx.idEstablecimiento !== id_establecimiento) {
      throw new AuthError('forbidden', 'No tienes acceso a este establecimiento', 403);
    }

    const { data, error } = await admin
      .from('establecimientos')
      .select('*')
      .eq('id_establecimiento', id_establecimiento)
      .single();
    if (error || !data) throw new AuthError('not_found', 'Establecimiento no encontrado', 404);
    return data;
  },

  // Conteo total — solo SuperAdmin (para dashboard-service / AdminDashboardScreen).
  async contarEstablecimientos(_payload, ctx, admin) {
    if (ctx.rol !== 'SuperAdmin') {
      throw new AuthError('forbidden', 'No tienes acceso a este conteo', 403);
    }
    const { count, error } = await admin
      .from('establecimientos')
      .select('id_establecimiento', { count: 'exact', head: true });
    if (error) throw error;
    return { total: count ?? 0 };
  },

  // Edita un establecimiento existente — solo SuperAdmin.
  async actualizar(payload, ctx, admin) {
    if (ctx.rol !== 'SuperAdmin') {
      throw new AuthError('forbidden', 'Solo el SuperAdmin puede editar establecimientos', 403);
    }
    const { id_establecimiento, nombre_establecimiento, ciudad_municipio, tipo } = payload as {
      id_establecimiento?: string;
      nombre_establecimiento?: string;
      ciudad_municipio?: string;
      tipo?: 'Centro de Salud' | 'Farmacia';
    };
    if (!id_establecimiento) throw new AuthError('invalid_payload', 'Falta id_establecimiento', 400);

    const cambios: Record<string, unknown> = {};
    if (typeof nombre_establecimiento === 'string' && nombre_establecimiento.trim()) cambios.nombre_establecimiento = nombre_establecimiento.trim();
    if (typeof ciudad_municipio === 'string' && ciudad_municipio.trim()) cambios.ciudad_municipio = ciudad_municipio.trim();
    if (tipo) cambios.tipo = tipo;

    if (Object.keys(cambios).length === 0) {
      throw new AuthError('invalid_payload', 'No hay campos válidos para actualizar', 400);
    }

    const { data, error } = await admin
      .from('establecimientos')
      .update(cambios)
      .eq('id_establecimiento', id_establecimiento)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Elimina un establecimiento — solo si no tiene personal asignado (si no,
  // esos usuarios quedarían sin establecimiento). Solo SuperAdmin.
  async eliminar(payload, ctx, admin) {
    if (ctx.rol !== 'SuperAdmin') {
      throw new AuthError('forbidden', 'Solo el SuperAdmin puede eliminar establecimientos', 403);
    }
    const { id_establecimiento } = payload as { id_establecimiento?: string };
    if (!id_establecimiento) throw new AuthError('invalid_payload', 'Falta id_establecimiento', 400);

    const { count, error: countError } = await admin
      .from('usuarios')
      .select('id_usuario', { count: 'exact', head: true })
      .eq('id_establecimiento', id_establecimiento);
    if (countError) throw countError;
    if ((count ?? 0) > 0) {
      throw new AuthError(
        'has_dependents',
        `No se puede eliminar: hay ${count} usuario(s) asignado(s) a este establecimiento. Reasígnalos primero.`,
        409,
      );
    }

    const { error } = await admin.from('establecimientos').delete().eq('id_establecimiento', id_establecimiento);
    if (error) throw error;
    return { eliminado: true };
  },
});
