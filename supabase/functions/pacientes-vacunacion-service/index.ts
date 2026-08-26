import { defineService } from '../_shared/handler.ts';
import { AuthError, ROLES_STAFF, type Rol } from '../_shared/authContext.ts';

function generarTokenQR(): string {
  return crypto.randomUUID();
}

// Verifica que el paciente exista y, si quien llama es tutor, que sea el
// tutor registrado del paciente. El personal de salud/admin puede acceder
// a cualquier paciente (autorización delegada a requireRole en cada acción).
async function verificarAccesoPaciente(admin: any, ctx: { userId: string; rol: Rol }, id_paciente: string) {
  const { data: paciente, error } = await admin
    .from('pacientes')
    .select('id_tutor_registro')
    .eq('id_paciente', id_paciente)
    .single();

  if (error || !paciente) throw new AuthError('not_found', 'Paciente no encontrado', 404);

  if (ctx.rol === 'Tutor_PersonaNormal' && paciente.id_tutor_registro !== ctx.userId) {
    throw new AuthError('forbidden', 'No tienes acceso al expediente de este paciente', 403);
  }
  return paciente;
}

defineService({
  // Lectura pública (para cualquier usuario autenticado) del catálogo oficial de vacunas.
  async listarCatalogoVacunas(_payload, _ctx, admin) {
    const { data, error } = await admin
      .from('cat_vacunas_oficiales')
      .select('*')
      .order('edad_meses_ideal', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  // Un tutor registra a su propio hijo, o personal/admin registra el paciente
  // de un tutor específico (ej. alta conjunta usuario+paciente en CreateUserScreen).
  async registrarPaciente(payload, ctx, admin) {
    const { nombre_completo, fecha_nacimiento, sexo, es_embarazada, id_tutor_registro } = payload as {
      nombre_completo?: string;
      fecha_nacimiento?: string;
      sexo?: 'M' | 'F';
      es_embarazada?: boolean;
      id_tutor_registro?: string;
    };

    if (!nombre_completo?.trim() || !fecha_nacimiento || !sexo) {
      throw new AuthError('invalid_payload', 'Faltan datos del paciente (nombre, fecha de nacimiento, sexo)', 400);
    }

    let tutorId = ctx.userId;
    if (id_tutor_registro && id_tutor_registro !== ctx.userId) {
      if (!ROLES_STAFF.includes(ctx.rol)) {
        throw new AuthError('forbidden', 'Solo personal de salud o administradores pueden registrar un paciente para otro tutor', 403);
      }
      tutorId = id_tutor_registro;
    }

    const { data, error } = await admin
      .from('pacientes')
      .insert([{
        id_tutor_registro: tutorId,
        nombre_completo: nombre_completo.trim(),
        fecha_nacimiento,
        sexo,
        es_embarazada: sexo === 'F' ? !!es_embarazada : false,
        codigo_qr_token: generarTokenQR(),
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Lista los hijos/pacientes del tutor autenticado.
  async listarHijosDeTutor(_payload, ctx, admin) {
    const { data, error } = await admin
      .from('pacientes')
      .select('*')
      .eq('id_tutor_registro', ctx.userId)
      .order('fecha_registro', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  // Resuelve un QR escaneado (id_paciente + token) a los datos básicos del paciente.
  // Solo personal de salud/admin puede escanear (un tutor no necesita esta acción).
  async obtenerPacientePorQR(payload, ctx, admin) {
    if (!ROLES_STAFF.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo personal de salud puede escanear pacientes', 403);
    }
    const { id_paciente, token } = payload as { id_paciente?: string; token?: string };
    if (!id_paciente || !token) throw new AuthError('invalid_payload', 'Falta id_paciente o token', 400);

    const { data, error } = await admin
      .from('pacientes')
      .select('id_paciente, nombre_completo, codigo_qr_token')
      .eq('id_paciente', id_paciente)
      .eq('codigo_qr_token', token)
      .single();
    if (error || !data) throw new AuthError('not_found', 'Paciente no encontrado con este código QR', 404);
    return data;
  },

  // Expediente completo de un paciente, con el tutor (para que el personal de
  // salud sepa a quién contactar). El tutor solo puede pedir el suyo.
  async obtenerPaciente(payload, ctx, admin) {
    const { id_paciente } = payload as { id_paciente?: string };
    if (!id_paciente) throw new AuthError('invalid_payload', 'Falta id_paciente', 400);

    const { data, error } = await admin
      .from('pacientes')
      .select('*, usuarios ( nombre_completo, correo_electronico )')
      .eq('id_paciente', id_paciente)
      .single();
    if (error || !data) throw new AuthError('not_found', 'Paciente no encontrado', 404);

    if (ctx.rol === 'Tutor_PersonaNormal' && data.id_tutor_registro !== ctx.userId) {
      throw new AuthError('forbidden', 'No tienes acceso al expediente de este paciente', 403);
    }
    return data;
  },

  // Historial de dosis aplicadas + catálogo completo (para calcular pendientes),
  // en una sola llamada — es lo que ChildDetailScreen y PatientScanResultScreen necesitan juntos.
  async listarDosisDePaciente(payload, ctx, admin) {
    const { id_paciente } = payload as { id_paciente?: string };
    if (!id_paciente) throw new AuthError('invalid_payload', 'Falta id_paciente', 400);

    await verificarAccesoPaciente(admin, ctx, id_paciente);

    const [dosisRes, catalogoRes] = await Promise.all([
      admin
        .from('dosis_aplicadas')
        .select(`
          id_registro, fecha_aplicacion, fecha_vencimiento_proxima, lote, origen_registro,
          cat_vacunas_oficiales ( id_vacuna, nombre_enfermedad, dosis_numero, edad_meses_ideal )
        `)
        .eq('id_paciente', id_paciente)
        .order('fecha_aplicacion', { ascending: false }),
      admin
        .from('cat_vacunas_oficiales')
        .select('*')
        .order('edad_meses_ideal', { ascending: true }),
    ]);
    if (dosisRes.error) throw dosisRes.error;
    if (catalogoRes.error) throw catalogoRes.error;

    return { dosis: dosisRes.data ?? [], catalogo: catalogoRes.data ?? [] };
  },

  // Pacientes distintos que el profesional de salud autenticado ha atendido
  // (deduplicados, con la fecha de la atención más reciente).
  async listarPacientesAtendidosPorUsuario(_payload, ctx, admin) {
    if (!ROLES_STAFF.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo personal de salud tiene lista de pacientes atendidos', 403);
    }
    const { data, error } = await admin
      .from('dosis_aplicadas')
      .select(`
        id_registro, fecha_aplicacion,
        pacientes ( id_paciente, nombre_completo, fecha_nacimiento, sexo )
      `)
      .eq('id_usuario_atendedor', ctx.userId)
      .order('fecha_aplicacion', { ascending: false });
    if (error) throw error;

    const map = new Map<string, any>();
    (data ?? []).forEach((d: any) => {
      if (d.pacientes && !map.has(d.pacientes.id_paciente)) {
        map.set(d.pacientes.id_paciente, { ...d.pacientes, ultima_atencion: d.fecha_aplicacion });
      }
    });
    return Array.from(map.values());
  },

  // Registro manual de una dosis (formulario RegisterDoseScreen) por personal de salud/admin.
  async registrarDosis(payload, ctx, admin) {
    if (!ROLES_STAFF.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo personal de salud puede registrar dosis', 403);
    }
    const { id_paciente, id_vacuna, fecha_aplicacion, lote, fecha_vencimiento_proxima } = payload as {
      id_paciente?: string;
      id_vacuna?: string;
      fecha_aplicacion?: string;
      lote?: string | null;
      fecha_vencimiento_proxima?: string | null;
    };
    if (!id_paciente || !id_vacuna || !fecha_aplicacion) {
      throw new AuthError('invalid_payload', 'Faltan datos de la dosis (paciente, vacuna o fecha)', 400);
    }

    const { data, error } = await admin
      .from('dosis_aplicadas')
      .insert([{
        id_paciente,
        id_vacuna,
        id_usuario_atendedor: ctx.userId,
        fecha_aplicacion,
        origen_registro: 'Validado_En_Establecimiento',
        lote: lote ?? null,
        fecha_vencimiento_proxima: fecha_vencimiento_proxima ?? null,
      }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new AuthError('duplicate_dose', 'Esta dosis ya fue registrada para este paciente', 409);
      }
      throw error;
    }
    return data;
  },

  // Guarda en bloque las dosis extraídas por carnet-ocr-service a partir de una
  // cartilla física (foto o PDF). Único punto de escritura para ese flujo —
  // CarnetUploadModal ya no inserta directo en dosis_aplicadas.
  async importarDosisDesdeCartilla(payload, ctx, admin) {
    const { id_paciente, dosis } = payload as {
      id_paciente?: string;
      dosis?: { id_vacuna: string; fecha: string; lote?: string | null }[];
    };
    if (!id_paciente || !Array.isArray(dosis) || dosis.length === 0) {
      throw new AuthError('invalid_payload', 'Faltan datos de las dosis a importar', 400);
    }

    await verificarAccesoPaciente(admin, ctx, id_paciente);

    const seen = new Set<string>();
    const rows = dosis
      .filter((d) => d.id_vacuna && d.fecha)
      .filter((d) => {
        const yaVisto = seen.has(d.id_vacuna);
        seen.add(d.id_vacuna);
        return !yaVisto;
      })
      .map((d) => ({
        id_paciente,
        id_vacuna: d.id_vacuna,
        fecha_aplicacion: d.fecha,
        lote: d.lote || null,
        origen_registro: 'Migrado_Cartilla_Fisica',
        id_usuario_atendedor: ctx.userId,
      }));

    if (rows.length === 0) {
      throw new AuthError('invalid_payload', 'Ninguna dosis tiene vacuna y fecha válidas', 400);
    }

    const { error } = await admin
      .from('dosis_aplicadas')
      .upsert(rows, { onConflict: 'id_paciente,id_vacuna', ignoreDuplicates: true });
    if (error) throw error;

    return { guardadas: rows.length };
  },

  // Próxima vacuna pendiente (fecha de refuerzo más cercana) entre todos los
  // hijos del tutor autenticado — para la tarjeta "Próxima vacuna" de HomeScreen.
  async obtenerProximaVacunaTutor(_payload, ctx, admin) {
    const { data: hijos, error: hijosError } = await admin
      .from('pacientes')
      .select('id_paciente')
      .eq('id_tutor_registro', ctx.userId);
    if (hijosError) throw hijosError;

    const ids = (hijos ?? []).map((h: any) => h.id_paciente);
    if (ids.length === 0) return null;

    const { data, error } = await admin
      .from('dosis_aplicadas')
      .select(`
        fecha_vencimiento_proxima,
        cat_vacunas_oficiales ( nombre_enfermedad ),
        pacientes ( nombre_completo )
      `)
      .in('id_paciente', ids)
      .not('fecha_vencimiento_proxima', 'is', null)
      .gte('fecha_vencimiento_proxima', new Date().toISOString())
      .order('fecha_vencimiento_proxima', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ?? null;
  },

  // Estadísticas de actividad del profesional de salud autenticado (dosis
  // aplicadas hoy/este mes + últimas atenciones), para HealthDashboardScreen.
  async obtenerEstadisticasAtencion(_payload, ctx, admin) {
    if (!ROLES_STAFF.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo personal de salud tiene estadísticas de atención', 403);
    }
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();

    const [resHoy, resMes, resRecientes] = await Promise.all([
      admin.from('dosis_aplicadas').select('id_registro', { count: 'exact', head: true })
        .eq('id_usuario_atendedor', ctx.userId).gte('fecha_aplicacion', inicioHoy),
      admin.from('dosis_aplicadas').select('id_registro', { count: 'exact', head: true })
        .eq('id_usuario_atendedor', ctx.userId).gte('fecha_aplicacion', inicioMes),
      admin.from('dosis_aplicadas').select(`
          id_registro, fecha_aplicacion,
          cat_vacunas_oficiales ( nombre_enfermedad, dosis_numero ),
          pacientes ( nombre_completo )
        `).eq('id_usuario_atendedor', ctx.userId).order('fecha_aplicacion', { ascending: false }).limit(4),
    ]);

    return {
      hoy: resHoy.count ?? 0,
      mes: resMes.count ?? 0,
      recientes: resRecientes.data ?? [],
    };
  },

  // Corrige los datos de un paciente ya registrado (error al cargarlo). El
  // tutor solo puede editar a sus propios hijos; personal/admin, a cualquiera.
  async actualizarPaciente(payload, ctx, admin) {
    const { id_paciente, nombre_completo, fecha_nacimiento, sexo, es_embarazada } = payload as {
      id_paciente?: string;
      nombre_completo?: string;
      fecha_nacimiento?: string;
      sexo?: 'M' | 'F';
      es_embarazada?: boolean;
    };
    if (!id_paciente) throw new AuthError('invalid_payload', 'Falta id_paciente', 400);

    await verificarAccesoPaciente(admin, ctx, id_paciente);

    const cambios: Record<string, unknown> = {};
    if (typeof nombre_completo === 'string' && nombre_completo.trim()) cambios.nombre_completo = nombre_completo.trim();
    if (typeof fecha_nacimiento === 'string' && fecha_nacimiento) cambios.fecha_nacimiento = fecha_nacimiento;
    if (sexo === 'M' || sexo === 'F') cambios.sexo = sexo;
    if (typeof es_embarazada === 'boolean') {
      // Si el sexo final (nuevo o el que ya tenía) no es 'F', no puede quedar embarazada=true.
      cambios.es_embarazada = cambios.sexo === 'M' ? false : es_embarazada;
    }

    if (Object.keys(cambios).length === 0) {
      throw new AuthError('invalid_payload', 'No hay campos válidos para actualizar', 400);
    }

    const { data, error } = await admin
      .from('pacientes')
      .update(cambios)
      .eq('id_paciente', id_paciente)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Corrige una dosis mal registrada (fecha, lote, próxima cita). Solo personal/admin.
  async actualizarDosis(payload, ctx, admin) {
    if (!ROLES_STAFF.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo personal de salud puede corregir dosis', 403);
    }
    const { id_registro, fecha_aplicacion, lote, fecha_vencimiento_proxima } = payload as {
      id_registro?: string;
      fecha_aplicacion?: string;
      lote?: string | null;
      fecha_vencimiento_proxima?: string | null;
    };
    if (!id_registro) throw new AuthError('invalid_payload', 'Falta id_registro', 400);

    const cambios: Record<string, unknown> = {};
    if (typeof fecha_aplicacion === 'string' && fecha_aplicacion) cambios.fecha_aplicacion = fecha_aplicacion;
    if (lote !== undefined) cambios.lote = lote || null;
    if (fecha_vencimiento_proxima !== undefined) cambios.fecha_vencimiento_proxima = fecha_vencimiento_proxima || null;

    if (Object.keys(cambios).length === 0) {
      throw new AuthError('invalid_payload', 'No hay campos válidos para actualizar', 400);
    }

    const { data, error } = await admin
      .from('dosis_aplicadas')
      .update(cambios)
      .eq('id_registro', id_registro)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Elimina una dosis mal registrada. Solo personal/admin.
  async eliminarDosis(payload, ctx, admin) {
    if (!ROLES_STAFF.includes(ctx.rol)) {
      throw new AuthError('forbidden', 'Solo personal de salud puede eliminar dosis', 403);
    }
    const { id_registro } = payload as { id_registro?: string };
    if (!id_registro) throw new AuthError('invalid_payload', 'Falta id_registro', 400);

    const { error } = await admin.from('dosis_aplicadas').delete().eq('id_registro', id_registro);
    if (error) throw error;
    return { eliminado: true };
  },

  // Agrega una vacuna al catálogo oficial PAI. Solo SuperAdmin.
  async crearVacunaCatalogo(payload, ctx, admin) {
    if (ctx.rol !== 'SuperAdmin') {
      throw new AuthError('forbidden', 'Solo el SuperAdmin puede editar el catálogo de vacunas', 403);
    }
    const { nombre_enfermedad, dosis_numero, edad_meses_ideal } = payload as {
      nombre_enfermedad?: string;
      dosis_numero?: string;
      edad_meses_ideal?: number;
    };
    if (!nombre_enfermedad?.trim() || !dosis_numero?.trim() || typeof edad_meses_ideal !== 'number') {
      throw new AuthError('invalid_payload', 'Faltan datos de la vacuna', 400);
    }

    const { data, error } = await admin
      .from('cat_vacunas_oficiales')
      .insert([{ nombre_enfermedad: nombre_enfermedad.trim(), dosis_numero: dosis_numero.trim(), edad_meses_ideal }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Edita una vacuna del catálogo oficial. Solo SuperAdmin.
  async actualizarVacunaCatalogo(payload, ctx, admin) {
    if (ctx.rol !== 'SuperAdmin') {
      throw new AuthError('forbidden', 'Solo el SuperAdmin puede editar el catálogo de vacunas', 403);
    }
    const { id_vacuna, nombre_enfermedad, dosis_numero, edad_meses_ideal } = payload as {
      id_vacuna?: string;
      nombre_enfermedad?: string;
      dosis_numero?: string;
      edad_meses_ideal?: number;
    };
    if (!id_vacuna) throw new AuthError('invalid_payload', 'Falta id_vacuna', 400);

    const cambios: Record<string, unknown> = {};
    if (typeof nombre_enfermedad === 'string' && nombre_enfermedad.trim()) cambios.nombre_enfermedad = nombre_enfermedad.trim();
    if (typeof dosis_numero === 'string' && dosis_numero.trim()) cambios.dosis_numero = dosis_numero.trim();
    if (typeof edad_meses_ideal === 'number') cambios.edad_meses_ideal = edad_meses_ideal;

    if (Object.keys(cambios).length === 0) {
      throw new AuthError('invalid_payload', 'No hay campos válidos para actualizar', 400);
    }

    const { data, error } = await admin
      .from('cat_vacunas_oficiales')
      .update(cambios)
      .eq('id_vacuna', id_vacuna)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Elimina una vacuna del catálogo. Falla si ya hay dosis aplicadas
  // registradas con ella (constraint RESTRICT en dosis_aplicadas.id_vacuna).
  async eliminarVacunaCatalogo(payload, ctx, admin) {
    if (ctx.rol !== 'SuperAdmin') {
      throw new AuthError('forbidden', 'Solo el SuperAdmin puede editar el catálogo de vacunas', 403);
    }
    const { id_vacuna } = payload as { id_vacuna?: string };
    if (!id_vacuna) throw new AuthError('invalid_payload', 'Falta id_vacuna', 400);

    const { error } = await admin.from('cat_vacunas_oficiales').delete().eq('id_vacuna', id_vacuna);
    if (error) {
      if (error.code === '23503') {
        throw new AuthError(
          'has_dependents',
          'No se puede eliminar: ya hay dosis aplicadas registradas con esta vacuna. Edítala en vez de borrarla.',
          409,
        );
      }
      throw error;
    }
    return { eliminado: true };
  },
});
