import { defineService } from '../_shared/handler.ts';
import { AuthError } from '../_shared/authContext.ts';

const GROQ_KEY = Deno.env.get('GROQ_API_KEY')!;

type DosisExtraida = { vacuna: string; fecha: string | null; lote: string | null };

function extractTextFromPDF(bytes: Uint8Array): string {
  const raw = new TextDecoder('latin1').decode(bytes);
  // Extraer contenido entre BT (begin text) y ET (end text) de los streams PDF
  const streams = raw.match(/BT[\s\S]*?ET/g) ?? [];
  const parts: string[] = [];
  for (const stream of streams) {
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

async function pedirAGroq(body: Record<string, unknown>): Promise<{ dosis: DosisExtraida[] }> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AuthError('groq_error', `Groq respondió con error ${res.status}`, 502);

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';
  let parsed: { dosis?: DosisExtraida[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { dosis: [] };
  }
  return { dosis: parsed.dosis ?? [] };
}

defineService({
  // Lee un PDF de texto (no escaneado) y extrae las dosis con Groq.
  async analizarPDF(payload) {
    const { base64 } = payload as { base64?: string };
    if (!base64) throw new AuthError('invalid_payload', 'Falta el PDF en base64', 400);

    const pdfBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const texto = extractTextFromPDF(pdfBytes);

    if (!texto || texto.length < 20) {
      return { dosis: [], sinTexto: true };
    }

    return pedirAGroq({
      model: 'openai/gpt-oss-20b',
      response_format: { type: 'json_object' },
      max_tokens: 1400,
      reasoning_effort: 'low',
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
    });
  },

  // Analiza una foto del carnet físico (cámara o galería) con el modelo de visión de Groq.
  async analizarImagen(payload) {
    const { base64 } = payload as { base64?: string };
    if (!base64) throw new AuthError('invalid_payload', 'Falta la imagen en base64', 400);

    return pedirAGroq({
      model: 'qwen/qwen3.6-27b',
      response_format: { type: 'json_object' },
      max_tokens: 1400,
      reasoning_effort: 'none',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
          {
            type: 'text',
            text: 'Eres un lector de carnets de vacunación bolivianos. Extrae TODAS las vacunas aplicadas visibles. Responde SOLO con JSON: {"dosis":[{"vacuna":"nombre en español","fecha":"DD/MM/YYYY","lote":"numero o null"}]}. Si un campo no es legible usa null.',
          },
        ],
      }],
    });
  },
});
