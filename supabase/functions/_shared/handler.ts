import { createAdminClient, type AdminClient } from './supabaseAdmin.ts';
import { getAuthContext, AuthContext, AuthError } from './authContext.ts';
import { ok, fail } from './response.ts';
import { CORS_HEADERS } from './cors.ts';

type ActionHandler = (
  payload: any,
  ctx: AuthContext,
  admin: AdminClient,
) => Promise<unknown>;

// Contrato estándar de todos los microservicios (ver docs/ARQUITECTURA_MICROSERVICIOS.md,
// sección 4): un único endpoint por servicio, enrutado por `action`, con
// { ok, data } / { ok:false, error } como shape de respuesta.
export function defineService(actions: Record<string, ActionHandler>) {
  const admin = createAdminClient();

  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    let body: { action?: string; payload?: unknown };
    try {
      body = await req.json();
    } catch {
      return fail('invalid_json', 'El cuerpo de la petición debe ser JSON válido', 400);
    }

    const { action, payload } = body;
    const handler = action ? actions[action] : undefined;
    if (!handler) {
      return fail('unknown_action', `Acción "${action}" no reconocida por este servicio`, 404);
    }

    try {
      const ctx = await getAuthContext(req, admin);
      const data = await handler(payload ?? {}, ctx, admin);
      return ok(data);
    } catch (err) {
      if (err instanceof AuthError) {
        return fail(err.code, err.message, err.status);
      }
      console.error(`[${action}] error:`, err);
      const message = err instanceof Error ? err.message : String(err);
      return fail('internal_error', message, 500);
    }
  });
}
