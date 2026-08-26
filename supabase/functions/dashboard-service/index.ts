import { defineService } from '../_shared/handler.ts';
import { AuthError, ROLES_ADMIN } from '../_shared/authContext.ts';

// Único servicio de agregación de solo lectura: compone datos de usuarios,
// establecimientos, pacientes y dosis_aplicadas para AdminDashboardScreen.
// Es la excepción documentada a "un dominio, un dueño" (ver
// docs/ARQUITECTURA_MICROSERVICIOS.md, sección 3.6 — patrón CQRS / API composition).
defineService({
  async obtenerResumenAdmin(_payload, ctx, admin) {
    if (!ROLES_ADMIN.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo administradores tienen acceso al panel', 403);
    }

    if (ctx.rol === 'SuperAdmin') {
      const [resEst, resUsers, resPac, resDosis] = await Promise.all([
        admin.from('establecimientos').select('id_establecimiento', { count: 'exact', head: true }),
        admin.from('usuarios').select('id_usuario', { count: 'exact', head: true }),
        admin.from('pacientes').select('id_paciente', { count: 'exact', head: true }),
        admin.from('dosis_aplicadas').select('id_registro', { count: 'exact', head: true }),
      ]);
      return {
        establecimiento: null,
        stats: {
          establecimientos: resEst.count ?? 0,
          usuarios: resUsers.count ?? 0,
          pacientes: resPac.count ?? 0,
          dosis: resDosis.count ?? 0,
        },
        catalogo: [],
      };
    }

    // AdminEstablecimiento
    if (!ctx.idEstablecimiento) {
      return { establecimiento: null, stats: { establecimientos: 0, usuarios: 0, pacientes: 0, dosis: 0 }, catalogo: [] };
    }

    const [estRes, resPersonal, resDosis, resCat] = await Promise.all([
      admin.from('establecimientos').select('*').eq('id_establecimiento', ctx.idEstablecimiento).single(),
      admin.from('usuarios').select('id_usuario', { count: 'exact', head: true }).eq('id_establecimiento', ctx.idEstablecimiento),
      admin.from('dosis_aplicadas').select('id_registro', { count: 'exact', head: true }),
      admin.from('cat_vacunas_oficiales').select('*').order('edad_meses_ideal', { ascending: true }),
    ]);

    return {
      establecimiento: estRes.data ?? null,
      stats: {
        establecimientos: 1,
        usuarios: resPersonal.count ?? 0,
        pacientes: 0,
        dosis: resDosis.count ?? 0,
      },
      catalogo: resCat.data ?? [],
    };
  },
});
