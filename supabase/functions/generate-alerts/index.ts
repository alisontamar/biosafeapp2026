import { createClient } from 'jsr:@supabase/supabase-js@2';

const TAVILY_KEY = Deno.env.get('TAVILY_API_KEY')!;
const GROQ_KEY = Deno.env.get('GROQ_API_KEY')!;
const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SUPA_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const QUERIES = [
  'alertas epidemiológicas brotes enfermedades Bolivia',
  'enfermedades prevenibles vacunación Bolivia OPS',
];

const OFFICIAL_DOMAINS = [
  'paho.org',
  'ops.org',
  'who.int',
  'minsalud.gob.bo',
  'cdc.gov',
  'ecdc.europa.eu',
];

Deno.serve(async (req) => {
  // Simple bearer-token guard: set FUNCTION_SECRET in Supabase secrets
  // and pass it as Authorization: Bearer <secret> from the cron trigger
  const secret = Deno.env.get('FUNCTION_SECRET');
  if (secret) {
    const auth = req.headers.get('Authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    // 1. Collect search results from both queries
    const results: { url: string; content: string }[] = [];

    for (const query of QUERIES) {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query,
          search_depth: 'basic',
          topic: 'news',
          days: 30,
          include_domains: OFFICIAL_DOMAINS,
          max_results: 4,
        }),
      });

      if (!res.ok) {
        console.error('Tavily error', res.status, await res.text());
        continue;
      }

      const data = await res.json();
      for (const r of (data.results ?? [])) {
        results.push({ url: r.url, content: r.content?.slice(0, 800) ?? '' });
      }
    }

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No Tavily results' }),
        { headers: { 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    // 2. Ask Groq to synthesize 2–4 alerts in Spanish
    const context = results
      .map((r) => `Fuente: ${r.url}\n${r.content}`)
      .join('\n\n---\n\n');

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        response_format: { type: 'json_object' },
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente de salud pública en Bolivia. Responde siempre con JSON válido.',
          },
          {
            role: 'user',
            content: `Basándote en las siguientes noticias recientes de fuentes oficiales, genera entre 2 y 4 alertas epidemiológicas breves y relevantes para la población boliviana (énfasis en vacunación y enfermedades prevenibles).\n\nResponde SOLO con este JSON:\n{"alertas":[{"titulo":"...","resumen":"...","nivel":"info|warning|critical","fuente_url":"..."}]}\n\nNoticias:\n${context}`,
          },
        ],
      }),
    });

    if (!groqRes.ok) {
      console.error('Groq error', groqRes.status, await groqRes.text());
      return new Response(
        JSON.stringify({ ok: false, error: 'Groq failed' }),
        { headers: { 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(rawContent);
    const alertas: { titulo: string; resumen: string; nivel: string; fuente_url: string }[] =
      parsed.alertas ?? [];

    if (alertas.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Groq returned no alerts' }),
        { headers: { 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    // 3. Save to Supabase — deactivate old, insert new
    const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY);

    await supabase
      .from('alertas_epidemiologicas_ia')
      .update({ activa: false })
      .eq('activa', true);

    const { error: insertError } = await supabase
      .from('alertas_epidemiologicas_ia')
      .insert(
        alertas.map((a) => ({
          titulo: a.titulo,
          resumen: a.resumen,
          nivel: a.nivel ?? 'info',
          fuente_url: a.fuente_url,
          activa: true,
        })),
      );

    if (insertError) {
      console.error('Insert error', insertError);
      return new Response(
        JSON.stringify({ ok: false, error: insertError.message }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 },
      );
    }

    return new Response(
      JSON.stringify({ ok: true, generadas: alertas.length }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unexpected error', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
