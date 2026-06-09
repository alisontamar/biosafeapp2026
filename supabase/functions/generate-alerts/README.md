# Alertas Epidemiológicas con IA — Documentación Técnica

Pipeline automático que genera alertas epidemiológicas actualizadas usando búsqueda web en fuentes oficiales + modelo de lenguaje, con un costo de **1 búsqueda por día** sin importar cuántos usuarios tenga la app.

---

## Arquitectura

```
pg_cron (Supabase, 1x/día)
        │
        ▼
Edge Function: generate-alerts
        │
        ├─► Tavily API  ──────► fuentes oficiales (OPS, OMS, CDC, etc.)
        │     └─ devuelve fragmentos de texto con URLs
        │
        ├─► Groq API  ────────► llama-3.1-8b-instant
        │     └─ sintetiza 2–4 alertas en español con nivel de urgencia
        │
        └─► Supabase DB
              ├─ desactiva alertas anteriores
              └─ inserta alertas nuevas

App (React Native)
        │
        └─► SELECT de alertas_epidemiologicas_ia WHERE activa = true
              └─ todos los usuarios leen el mismo resultado cacheado
```

---

## Componentes

### 1. Tavily API

Tavily es una API de búsqueda diseñada para agentes de IA. A diferencia de Google, devuelve fragmentos de texto directamente procesables (no HTML).

**Parámetros relevantes usados:**

| Parámetro | Valor | Razón |
|---|---|---|
| `search_depth` | `basic` | Suficiente para noticias; `advanced` cuesta 2 créditos |
| `topic` | `news` | Prioriza artículos recientes sobre páginas estáticas |
| `days` | `30` | Solo resultados de los últimos 30 días |
| `include_domains` | ver abajo | Limita a fuentes oficiales de salud |
| `max_results` | `4` | Suficiente contexto sin desperdiciar tokens en Groq |

**Dominios configurados:**
```
paho.org       → OPS (Organización Panamericana de la Salud)
ops.org        → OPS (alias)
who.int        → OMS
minsalud.gob.bo → Ministerio de Salud Bolivia
cdc.gov        → CDC Estados Unidos
ecdc.europa.eu → Centro Europeo para la Prevención y Control de Enfermedades
```

**Plan gratuito:** 1.000 búsquedas/mes. Con 2 queries/día = ~60 búsquedas/mes → bien dentro del límite.

**Para agregar más fuentes:** editar el array `OFFICIAL_DOMAINS` en `index.ts`.

---

### 2. Groq API

Modelo: `llama-3.1-8b-instant` (rápido, gratuito en el tier básico).

El prompt le pide que responda **solo JSON** con el schema:
```json
{
  "alertas": [
    {
      "titulo": "string",
      "resumen": "string (2-3 oraciones)",
      "nivel": "info | warning | critical",
      "fuente_url": "string (URL de la fuente)"
    }
  ]
}
```

Se usa `response_format: { type: 'json_object' }` para forzar salida JSON válida y evitar texto adicional.

El contexto que recibe Groq es: los fragmentos de Tavily concatenados, máximo 800 caracteres por resultado para no exceder el context window.

---

### 3. Edge Function (Supabase / Deno)

Archivo: `supabase/functions/generate-alerts/index.ts`

**Flujo interno:**
1. Verifica header `Authorization: Bearer <FUNCTION_SECRET>` (protege el endpoint)
2. Itera los dos queries en Tavily, acumula resultados únicos
3. Construye el contexto y llama a Groq
4. Parsea el JSON de Groq
5. En Supabase: `UPDATE SET activa = false` en alertas anteriores, luego `INSERT` de las nuevas
6. Devuelve `{ ok: true, generadas: N }`

**Manejo de errores:** Si Tavily o Groq fallan, la función retorna `{ ok: false, error: "..." }` con status 502. Las alertas anteriores **no se tocan** en caso de error — la app seguirá mostrando las últimas válidas.

---

### 4. Base de datos

Tabla: `alertas_epidemiologicas_ia`

```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
titulo           text NOT NULL
resumen          text NOT NULL
nivel            text NOT NULL CHECK (nivel IN ('info', 'warning', 'critical'))
fuente_url       text
activa           boolean NOT NULL DEFAULT true
fecha_generacion timestamptz NOT NULL DEFAULT now()
```

**RLS:** Solo lectura pública para filas con `activa = true`. La escritura la hace el service role (Edge Function), que bypassa RLS.

**Rotación de alertas:** La función desactiva todas las alertas anteriores antes de insertar las nuevas. No se borran — quedan en la tabla con `activa = false` como historial.

---

### 5. Cron job

Configurado con `pg_cron` (extensión de PostgreSQL incluida en Supabase).

```sql
select cron.schedule(
  'alertas-diarias',
  '0 6 * * *',   -- 6am UTC = 2am Bolivia (GMT-4)
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/generate-alerts',
    headers := '{"Authorization":"Bearer <FUNCTION_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

`pg_net` hace el HTTP POST de forma asíncrona — el cron termina inmediatamente y la función corre en paralelo.

**Ver jobs configurados:**
```sql
select * from cron.job;
```

**Eliminar el job si se necesita:**
```sql
select cron.unschedule('alertas-diarias');
```

---

## Variables de entorno (Supabase Secrets)

| Variable | Descripción |
|---|---|
| `TAVILY_API_KEY` | Key de [app.tavily.com](https://app.tavily.com) — plan gratuito |
| `GROQ_API_KEY` | Key de [console.groq.com](https://console.groq.com) |
| `FUNCTION_SECRET` | String arbitrario para proteger el endpoint HTTP |
| `SUPABASE_URL` | Inyectada automáticamente por Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Inyectada automáticamente por Supabase |

Subir secrets:
```bash
supabase secrets set TAVILY_API_KEY=tvly-...
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set FUNCTION_SECRET=tu_password_secreto
```

---

## Despliegue

```bash
supabase functions deploy generate-alerts --no-verify-jwt
```

**Probar manualmente (PowerShell):**
```powershell
Invoke-RestMethod `
  -Uri "https://<project-ref>.supabase.co/functions/v1/generate-alerts" `
  -Method POST `
  -Headers @{"Authorization"="Bearer <FUNCTION_SECRET>"; "Content-Type"="application/json"} `
  -Body "{}"
```

Respuesta esperada: `ok: True  generadas: 3`

---

## Costos estimados

| Servicio | Uso | Costo |
|---|---|---|
| Tavily | ~60 búsquedas/mes (2/día) | Gratis (límite: 1.000/mes) |
| Groq | ~30 llamadas/mes | Gratis (tier gratuito) |
| Supabase Edge Functions | ~30 invocaciones/mes | Gratis (límite: 500.000/mes) |
| Supabase DB | filas mínimas | Gratis |

**Total: $0/mes** en volúmenes normales de una app en crecimiento.

---

## Extensiones posibles

- **Agregar fuentes bolivianas**: Incorporar `snis.minsalud.gob.bo`, `senadis.gob.bo` al array de dominios.
- **Alertas por departamento**: Agregar columna `departamento` y hacer queries por ciudad ("brotes La Paz", "brotes Cochabamba").
- **Frecuencia mayor**: Cambiar el cron a `0 */12 * * *` para 2 veces al día (usa 4 búsquedas Tavily/día = ~120/mes, aún dentro del free tier).
- **Notificaciones push**: Al insertar alertas `critical`, disparar push notifications a través de Expo Notifications.
