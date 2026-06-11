// Edge Function: recibe un PDF en base64, extrae texto, lo manda a Groq
// y devuelve las dosis estructuradas en JSON.

const GROQ_KEY = Deno.env.get('GROQ_API_KEY')!;

function extractTextFromPDF(bytes: Uint8Array): string {
  const raw = new TextDecoder('latin1').decode(bytes);
  // Extraer contenido entre BT (begin text) y ET (end text) de los streams PDF
  const streams = raw.match(/BT[\s\S]*?ET/g) ?? [];
  const parts: string[] = [];
  for (const stream of streams) {
    // Strings entre paréntesis: (texto)
    const parens = stream.match(/\(([^)]{1,80})\)/g) ?? [];
    parts.push(parens.map((s) => s.slice(1, -1)).join(' '));
  }
  // También intentar extraer texto plano en streams descomprimidos
  const plainStreams = raw.match(/stream\r?\n([\s\S]*?)\r?\nendstream/g) ?? [];
  for (const s of plainStreams) {
    const printable = s.replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim();
    if (printable.length > 30) parts.push(printable.slice(0, 2000));
  }
  return parts.join('\n').replace(/\s+/g, ' ').trim().slice(0, 4000);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' },
    });
  }

  let body: { base64?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  if (!body.base64) {
    return new Response(JSON.stringify({ error: 'Missing base64 field' }), { status: 400 });
  }

  // Decodificar base64 a bytes
  const pdfBytes = Uint8Array.from(atob(body.base64), (c) => c.charCodeAt(0));
  const texto = extractTextFromPDF(pdfBytes);

  if (!texto || texto.length < 20) {
    return new Response(
      JSON.stringify({ error: 'no_text', dosis: [] }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Enviar texto extraído a Groq para estructurar las dosis
  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      max_tokens: 800,
      messages: [
        {
          role: 'system',
          content: 'Eres un extractor de datos de carnets de vacunación bolivianos. Responde solo con JSON válido.',
        },
        {
          role: 'user',
          content: `Del siguiente texto extraído de un PDF, identifica todos los registros de vacunación. Devuelve SOLO este JSON: {"dosis":[{"vacuna":"nombre en español","fecha":"DD/MM/YYYY o YYYY-MM-DD","lote":"numero o null"}]}\n\nTexto:\n${texto}`,
        },
      ],
    }),
  });

  if (!groqRes.ok) {
    return new Response(
      JSON.stringify({ error: `groq_error_${groqRes.status}`, dosis: [] }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  const groqData = await groqRes.json();
  const content = groqData.choices?.[0]?.message?.content ?? '{}';
  let parsed: { dosis?: unknown[] } = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { dosis: [] };
  }

  return new Response(
    JSON.stringify({ dosis: parsed.dosis ?? [] }),
    { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
  );
});
