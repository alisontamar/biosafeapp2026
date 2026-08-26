import { createClient } from 'jsr:@supabase/supabase-js@2';

export function createAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export type AdminClient = ReturnType<typeof createAdminClient>;
