import { createClient } from 'jsr:@supabase/supabase-js@2';

const GROQ_KEY = Deno.env.get('GROQ_API_KEY')!;
const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SUPA_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Configuración ───────────────────────────────────────────────

// Búsquedas en Google News RSS — gratis, sin API key y casi en tiempo real
// (los artículos aparecen apenas se publican, sin el retraso de indexación
// que tenía Tavily). Enfocadas en alertas oficiales del gobierno boliviano.
const NEWS_QUERIES = [
  'alerta naranja salud Bolivia',
  'brote enfermedad escuelas Bolivia',
  'SEDES alerta epidemiológica Bolivia',
  'Ministerio de Salud Bolivia casos confirmados brote',
  'dengue sarampión herpangina influenza Bolivia',
];

// Palabras clave de salud — se descartan resultados que no las contengan
const HEALTH_KEYWORDS = [
  'brote', 'alerta', 'epidemi', 'dengue', 'sarampión', 'sarampion', 'herpangina',
  'influenza', 'gripe', 'covid', 'zika', 'chikungunya', 'hantavirus', 'vacuna',
  'casos confirmados', 'sanitari', 'fiebre', 'hepatitis', 'tos ferina', 'rabia',
  'malaria', 'enfermedad', 'salud',
];

// Términos que confirman que la noticia es de Bolivia (texto del artículo)
const BOLIVIA_TERMS = [
  'bolivia', 'boliviano', 'boliviana', 'sedes', 'minsalud',
  'la paz', 'cochabamba', 'santa cruz', 'oruro', 'potosí', 'potosi',
  'chuquisaca', 'tarija', 'beni', 'pando', 'sucre', 'el alto',
  'quillacollo', 'sacaba', 'cercado', 'montero', 'tiquipaya', 'vinto',
];

// Medios bolivianos conocidos (nombre de la fuente en Google News)
const BOLIVIA_SOURCES = [
  'abi', 'agencia boliviana', 'deber', 'tiempos', 'razón', 'razon',
  'página siete', 'pagina siete', 'opinión', 'opinion', 'unitel',
  'erbol', 'correo del sur', 'el diario', 'ahora el pueblo', 'bolivisión',
  'bolivision', 'red uno', 'fides', 'brújula', 'brujula', 'urgente.bo',
];

const FETCH_TIMEOUT_MS = 20_000;

// Solo aceptar noticias publicadas en los últimos N días
const MAX_DAYS = 15;

// Cuántas noticias (máx) pasamos a Groq para sintetizar
const MAX_ITEMS_FOR_GROQ = 10;

// ─── Helpers ─────────────────────────────────────────────────────

function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

function googleNewsUrl(query: string): string {
  const q = encodeURIComponent(query);
  // hl/gl/ceid = español de Bolivia → prioriza cobertura boliviana
  return `https://news.google.com/rss/search?q=${q}&hl=es-419&gl=BO&ceid=BO:es`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTag(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  if (!m) return '';
  const v = m[1].trim().replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
  return decodeEntities(v);
}

type NewsItem = {
  title: string;
  link: string;
  source: string;
  desc: string;
  published: string;
};

function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  for (const b of blocks) {
    const srcMatch = b.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
    items.push({
      title: getTag(b, 'title'),
      link: getTag(b, 'link'),
      source: srcMatch ? decodeEntities(srcMatch[1].trim()) : '',
      desc: stripTags(getTag(b, 'description')),
      published: getTag(b, 'pubDate'),
    });
  }
  return items;
}

function isHealthRelated(text: string): boolean {
  const t = text.toLowerCase();
  return HEALTH_KEYWORDS.some((k) => t.includes(k));
}

// Confirma que la noticia es de Bolivia: por el texto (menciona Bolivia o un
// departamento) o por la fuente (medio boliviano). Descarta noticias de otros
// países (ej. OPS hablando de Panamá) que Google News trae por gl=BO.
function isBolivia(item: NewsItem): boolean {
  const texto = `${item.title} ${item.desc}`.toLowerCase();
  if (BOLIVIA_TERMS.some((k) => texto.includes(k))) return true;
  const fuente = item.source.toLowerCase();
  return BOLIVIA_SOURCES.some((k) => fuente.includes(k));
}

// Quita el sufijo " - Nombre del medio" del título para deduplicar
function dedupKey(title: string): string {
  return title.toLowerCase().replace(/\s*[-–]\s*[^-–]*$/, '').trim();
}

// ─── Handler ─────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const secret = Deno.env.get('FUNCTION_SECRET');
  if (secret) {
    const auth = req.headers.get('Authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    // 1. Buscar en Google News RSS (en paralelo)
    const responses = await Promise.allSettled(
      NEWS_QUERIES.map((q) =>
        fetchWithTimeout(googleNewsUrl(q), {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BioSafeBot/1.0)' },
        })
      )
    );

    const cutoffMs = Date.now() - MAX_DAYS * 24 * 60 * 60 * 1000;
    const seen = new Set<string>();
    const items: NewsItem[] = [];

    for (const settled of responses) {
      if (settled.status === 'rejected') {
        console.error('Google News fetch failed', settled.reason);
        continue;
      }
      const res = settled.value;
      if (!res.ok) {
        console.error('Google News error', res.status);
        continue;
      }
      const xml = await res.text();
      for (const it of parseRssItems(xml)) {
        // Recencia: descartar lo más viejo que MAX_DAYS
        const pubMs = it.published ? Date.parse(it.published) : NaN;
        if (!Number.isNaN(pubMs) && pubMs < cutoffMs) continue;
        // Relevancia de salud
        if (!isHealthRelated(`${it.title} ${it.desc}`)) continue;
        // Solo Bolivia (descarta noticias de otros países)
        if (!isBolivia(it)) {
          console.log('Descartada (no es de Bolivia):', it.title);
          continue;
        }
        // Deduplicar
        const key = dedupKey(it.title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        items.push(it);
      }
    }

    if (items.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No recent health news' }),
        { headers: { 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    // Ordenar por fecha (más reciente primero) y limitar
    items.sort((a, b) => {
      const ta = Date.parse(a.published) || 0;
      const tb = Date.parse(b.published) || 0;
      return tb - ta;
    });
    const topItems = items.slice(0, MAX_ITEMS_FOR_GROQ);

    // 2. Groq sintetiza las alertas y extrae la geolocalización
    const context = topItems
      .map((r, i) =>
        `[${i + 1}] ${r.title}\nFuente: ${r.source}\nFecha: ${r.published || 'desconocida'}\n` +
        `URL: ${r.link}\n${r.desc}`,
      )
      .join('\n\n---\n\n');

    const hoy = new Date().toISOString().slice(0, 10);

    const groqRes = await fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          response_format: { type: 'json_object' },
          max_tokens: 1600,
          reasoning_effort: 'low',
          messages: [
            {
              role: 'system',
              content:
                'Eres un asistente de salud pública en Bolivia. Respondes siempre con JSON válido.',
            },
            {
              role: 'user',
              content:
                `Hoy es ${hoy}. A partir de estas noticias de salud de medios y fuentes oficiales de Bolivia, ` +
                `genera entre 2 y 4 alertas epidemiológicas breves para la población boliviana.\n\n` +
                `REGLA ESTRICTA: SOLO genera alertas sobre brotes o situaciones de salud EN BOLIVIA. ` +
                `Si una noticia trata de otro país (Panamá, Perú, Brasil, etc.), IGNÓRALA por completo, ` +
                `aunque parezca relevante.\n\n` +
                `PRIORIZA alertas oficiales del gobierno (alerta naranja, alerta roja, declaratorias de ` +
                `SEDES o Ministerio de Salud) y brotes locales con casos confirmados.\n\n` +
                `Para cada alerta extrae la UBICACIÓN del brote:\n` +
                `- "departamento": exactamente uno de [La Paz, Cochabamba, Santa Cruz, Oruro, Potosí, ` +
                `Chuquisaca, Tarija, Beni, Pando]. Si afecta a todo el país usa "Nacional". Si no se sabe, usa null.\n` +
                `- "municipio": el municipio o ciudad si se menciona (ej. Cercado, Sacaba, Quillacollo), sino null.\n` +
                `- "enfermedad": nombre corto de la enfermedad (ej. herpangina, dengue, sarampión), sino null.\n\n` +
                `REGLA DE RECENCIA: usa solo noticias de los últimos ${MAX_DAYS} días. Ignora lo antiguo.\n\n` +
                `En "fuente_url" copia EXACTAMENTE la URL del campo URL de la noticia usada.\n\n` +
                `Responde SOLO con este JSON:\n` +
                `{"alertas":[{"titulo":"...","resumen":"...","nivel":"info|warning|critical",` +
                `"departamento":"...","municipio":"...","enfermedad":"...","fuente_url":"..."}]}\n\n` +
                `Noticias:\n${context}`,
            },
          ],
        }),
      }
    );

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
    type AlertaIA = {
      titulo: string;
      resumen: string;
      nivel: string;
      departamento?: string | null;
      municipio?: string | null;
      enfermedad?: string | null;
      fuente_url?: string | null;
    };
    const alertas: AlertaIA[] = parsed.alertas ?? [];

    if (alertas.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Groq returned no alerts' }),
        { headers: { 'Content-Type': 'application/json' }, status: 502 },
      );
    }

    // 3. Guardar en Supabase — insertar primero, desactivar las viejas solo si el insert fue exitoso
    const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY);

    // Capturar timestamp antes del insert para usarlo como corte al desactivar las viejas
    const cutoff = new Date().toISOString();

    const normalizar = (v?: string | null) => {
      const s = (v ?? '').trim();
      return s && s.toLowerCase() !== 'null' ? s : null;
    };

    const { error: insertError } = await supabase
      .from('alertas_epidemiologicas_ia')
      .insert(
        alertas.map((a) => ({
          titulo: a.titulo,
          resumen: a.resumen,
          nivel: a.nivel ?? 'info',
          fuente_url: normalizar(a.fuente_url),
          departamento: normalizar(a.departamento),
          municipio: normalizar(a.municipio),
          enfermedad: normalizar(a.enfermedad),
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

    // Solo desactivar alertas anteriores a este run — las recién insertadas tienen fecha >= cutoff
    await supabase
      .from('alertas_epidemiologicas_ia')
      .update({ activa: false })
      .eq('activa', true)
      .lt('fecha_generacion', cutoff);

    return new Response(
      JSON.stringify({ ok: true, generadas: alertas.length, noticiasEncontradas: items.length }),
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
