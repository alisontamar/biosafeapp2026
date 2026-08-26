import { defineService } from '../_shared/handler.ts';

const PESO_NIVEL: Record<string, number> = { critical: 0, warning: 1, info: 2 };

defineService({
  // Todas las alertas activas, más recientes primero — AlertsScreen.
  async listarActivas(_payload, _ctx, admin) {
    const { data, error } = await admin
      .from('alertas_epidemiologicas_ia')
      .select('id, titulo, resumen, nivel, fuente_url, fecha_generacion, departamento, municipio, enfermedad')
      .eq('activa', true)
      .order('fecha_generacion', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  // La alerta activa más grave/reciente de un departamento — tarjeta "Brote
  // cerca de ti" de HomeScreen.
  async obtenerAlertaCercana(payload, _ctx, admin) {
    const { departamento } = payload as { departamento?: string };
    if (!departamento) return null;

    const { data, error } = await admin
      .from('alertas_epidemiologicas_ia')
      .select('id, titulo, resumen, nivel, departamento, municipio, fecha_generacion')
      .eq('activa', true)
      .eq('departamento', departamento)
      .order('fecha_generacion', { ascending: false });
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const ordenadas = [...data].sort(
      (a, b) => (PESO_NIVEL[a.nivel] ?? 3) - (PESO_NIVEL[b.nivel] ?? 3),
    );
    return ordenadas[0];
  },
});
