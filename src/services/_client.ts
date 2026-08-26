import { supabase } from '../lib/supabase';

// Error estándar que lanzan todos los métodos de src/services/*.
// Envuelve el { code, message } que devuelven los microservicios
// (ver docs/ARQUITECTURA_MICROSERVICIOS.md, sección 4).
export class ServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ServiceError';
  }
}

type ServiceEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

// Wrapper único sobre supabase.functions.invoke para todos los microservicios.
// Cada servicio expone un solo endpoint enrutado por `action`.
export async function invoke<T>(
  service: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<ServiceEnvelope<T>>(service, {
    body: { action, payload },
  });

  if (error) {
    const parsed = await tryParseErrorBody(error);
    if (parsed && parsed.ok === false) {
      throw new ServiceError(parsed.error.code, parsed.error.message);
    }
    throw new ServiceError('network_error', error.message ?? 'No se pudo conectar con el servidor');
  }

  if (!data || data.ok === false) {
    throw new ServiceError(
      data?.ok === false ? data.error.code : 'unknown_error',
      data?.ok === false ? data.error.message : 'Ocurrió un error inesperado',
    );
  }

  return data.data;
}

// supabase-js entrega el cuerpo de la respuesta de error dentro de
// error.context (un Response) cuando la función respondió con un JSON
// { ok:false, error } y un status >= 400.
async function tryParseErrorBody(error: unknown): Promise<ServiceEnvelope<unknown> | null> {
  const context = (error as { context?: Response }).context;
  if (!context || typeof context.json !== 'function') return null;
  try {
    return await context.json();
  } catch {
    return null;
  }
}
