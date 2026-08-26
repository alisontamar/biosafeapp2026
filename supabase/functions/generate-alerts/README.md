# Alertas Epidemiológicas con IA — Documentación Técnica

Pipeline automático que genera **alertas epidemiológicas geolocalizadas de Bolivia**, usando búsqueda de noticias en tiempo real + un modelo de lenguaje. Costo: **$0** sin importar cuántos usuarios tenga la app, porque las alertas se generan una vez por día y todos los usuarios leen el mismo resultado cacheado.

> **Nota de versión:** Esta versión usa **Google News RSS** como fuente. Anteriormente se usaba Tavily, que se reemplazó porque tenía retraso de indexación (no encontraba artículos publicados el mismo día) y baja cobertura de medios bolivianos.

---

## Arquitectura

```
pg_cron (Supabase, 1x/día)
        │
        ▼
Edge Function: generate-alerts
        │
        ├─► Google News RSS ──► noticias de salud de Bolivia (tiempo real)
        │     └─ 5 búsquedas en paralelo, devuelve titulares + fuente + fecha
        │
        ├─► Filtros (en código) ──► recencia + salud + SOLO Bolivia + dedup
        │
        ├─► Groq API ────────────► openai/gpt-oss-20b
        │     └─ sintetiza 2–4 alertas y EXTRAE geolocalización
        │        (departamento, municipio, enfermedad)
        │
        └─► Supabase DB
              ├─ inserta alertas nuevas (con geo)
              └─ desactiva las anteriores (solo si el insert tuvo éxito)

App (React Native)
        │
        ├─► AlertsScreen: lista alertas activas, resalta las "Cerca de ti"
        │     según el departamento del usuario (GPS o IP)
        │
        └─► HomeScreen: tarjeta "Brote cerca de ti" si hay alerta en su zona
```

---

## Componentes

### 1. Google News RSS (fuente de noticias)

Endpoint público, gratis y sin API key:

```
https://news.google.com/rss/search?q=<QUERY>&hl=es-419&gl=BO&ceid=BO:es
```

- `hl=es-419&gl=BO&ceid=BO:es` → español de Bolivia, **sesga** los resultados hacia cobertura boliviana (no los restringe; por eso luego filtramos por país en código).
- Devuelve XML (RSS) con `<item>`: título, link, fecha (`pubDate`) y fuente (`<source>`).
- **Ventaja clave vs. Tavily:** los artículos aparecen apenas se publican, sin retraso de indexación.

**Las 5 búsquedas** (`NEWS_QUERIES` en `index.ts`), enfocadas en alertas oficiales del gobierno:
```
'alerta naranja salud Bolivia'
'brote enfermedad escuelas Bolivia'
'SEDES alerta epidemiológica Bolivia'
'Ministerio de Salud Bolivia casos confirmados brote'
'dengue sarampión herpangina influenza Bolivia'
```

> El link de cada noticia es una URL de Google News que **redirige** al artículo original (Google codifica la URL real). Funciona al tocarla en la app.

---

### 2. Filtros en código

Cada noticia pasa por 4 filtros antes de llegar a Groq:

| Filtro | Qué hace |
|---|---|
| **Recencia** | Descarta lo publicado hace más de `MAX_DAYS` (15 días). |
| **Salud** | Debe contener una palabra clave de salud (`HEALTH_KEYWORDS`: brote, dengue, alerta, vacuna, etc.). |
| **Solo Bolivia** | Debe mencionar Bolivia/un departamento (`BOLIVIA_TERMS`) **o** venir de un medio boliviano (`BOLIVIA_SOURCES`). Esto descarta noticias de otros países (ej. OPS hablando de Panamá) que `gl=BO` igual trae. |
| **Deduplicación** | Quita títulos repetidos (mismo brote reportado por varios medios). |

Las noticias que pasan se ordenan por fecha (más reciente primero) y se toman hasta `MAX_ITEMS_FOR_GROQ` (10).

**Para ajustar la cobertura:** edita las listas `NEWS_QUERIES`, `BOLIVIA_TERMS` o `BOLIVIA_SOURCES` en `index.ts`.

---

### 3. Groq API (síntesis + geolocalización)

Modelo: `openai/gpt-oss-20b` (rápido, gratuito). Reemplazó a `llama-3.1-8b-instant`, deprecado por Groq (shutdown 16/ago/2026).

Recibe los titulares filtrados y devuelve **solo JSON** con este schema:
```json
{
  "alertas": [
    {
      "titulo": "string",
      "resumen": "string (2-3 oraciones)",
      "nivel": "info | warning | critical",
      "departamento": "uno de los 9 departamentos | Nacional | null",
      "municipio": "ciudad/municipio si se menciona | null",
      "enfermedad": "nombre corto de la enfermedad | null",
      "fuente_url": "URL de la noticia usada"
    }
  ]
}
```

Reglas que se le imponen en el prompt:
- **Solo Bolivia:** ignora noticias de otros países aunque parezcan relevantes.
- **Prioriza alertas oficiales:** alerta naranja/roja, declaratorias de SEDES o Ministerio de Salud, brotes con casos confirmados.
- **Recencia:** solo noticias de los últimos 15 días.
- **Geolocalización:** extrae departamento (de la lista de los 9), municipio y enfermedad de cada noticia.

Se usa `response_format: { type: 'json_object' }` para forzar JSON válido.

---

### 4. Base de datos

Tabla: `alertas_epidemiologicas_ia`

```sql
id               uuid PRIMARY KEY DEFAULT gen_random_uuid()
titulo           text NOT NULL
resumen          text NOT NULL
nivel            text NOT NULL CHECK (nivel IN ('info', 'warning', 'critical'))
fuente_url       text
departamento     text          -- ← geolocalización (migración 20260630)
municipio        text          -- ←
enfermedad       text          -- ←
activa           boolean NOT NULL DEFAULT true
fecha_generacion timestamptz NOT NULL DEFAULT now()
```

- **Migración inicial:** `migrations/20260608_alertas_ia.sql` (tabla + RLS).
- **Migración geo:** `migrations/20260630_alertas_geo.sql` (columnas `departamento`, `municipio`, `enfermedad` + índice).

**RLS:** lectura pública solo de filas con `activa = true`. La escritura la hace el service role (Edge Function), que bypassa RLS.

**Rotación de alertas (importante):** El orden es **insertar primero, desactivar después**. Solo si el `INSERT` de las nuevas tuvo éxito se hace `UPDATE activa = false` sobre las anteriores (usando un timestamp de corte). Así, si Google News o Groq fallan, las alertas viejas **siguen visibles** en vez de dejar la app vacía.

---

### 5. Geolocalización en la app

**`src/lib/geo.ts`** — utilidades compartidas:
- `getDepartamentoUsuario()` → detecta el departamento del usuario por GPS (si dio permiso) o por IP (fallback sin permiso).
- `aDepartamento(texto)` → normaliza cualquier texto (región, ciudad) a uno de los 9 departamentos. Maneja alias (Sucre→Chuquisaca, Trinidad→Beni, Cobija→Pando).
- `alertaEsCercana(depAlerta, depUsuario)` → compara si una alerta es del departamento del usuario.

**`AlertsScreen`** → carga la ubicación y las alertas en paralelo; resalta con badge rojo **"Cerca de ti"** las del departamento del usuario y las ordena primero. Muestra la ubicación (municipio, departamento) de cada alerta.

**`HomeScreen`** → consulta si hay una alerta activa en el departamento del usuario; si la hay, muestra una tarjeta **"Brote cerca de ti"** arriba del todo (prioriza la más grave: critical > warning > info), que lleva a la pantalla de alertas al tocarla.

---

### 6. Cron job

Configurado con `pg_cron` (extensión de PostgreSQL incluida en Supabase).

```sql
select cron.schedule(
  'alertas-diarias',
  '0 6 * * *',   -- 6am UTC = 2am Bolivia (GMT-4)
  $$
  select net.http_post(
    url := 'https://<project-ref>.supabase.co/functions/v1/generate-alerts',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <FUNCTION_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
```

`pg_net` hace el HTTP POST de forma asíncrona — el cron termina al instante y la función corre en paralelo.

**Ver jobs:** `select * from cron.job;`
**Eliminar:** `select cron.unschedule('alertas-diarias');`

---

## Variables de entorno (Supabase Secrets)

| Variable | Descripción |
|---|---|
| `GROQ_API_KEY` | Key de [console.groq.com](https://console.groq.com) |
| `FUNCTION_SECRET` | String arbitrario para proteger el endpoint HTTP |
| `SUPABASE_URL` | Inyectada automáticamente por Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Inyectada automáticamente por Supabase |

> Ya **no** se necesita `TAVILY_API_KEY` (el método anterior).

Subir secrets:
```bash
supabase secrets set GROQ_API_KEY=gsk_...
supabase secrets set FUNCTION_SECRET=tu_password_secreto
```

---

## Despliegue

```bash
supabase functions deploy generate-alerts --no-verify-jwt
```

**Probar manualmente** (la forma confiable, vía SQL Editor — el botón "Invoke" del dashboard NO manda el `FUNCTION_SECRET` y da 401):

```sql
-- Dispara la función (asíncrono, devuelve un request_id)
select net.http_post(
  url := 'https://<project-ref>.supabase.co/functions/v1/generate-alerts',
  headers := '{"Content-Type":"application/json","Authorization":"Bearer <FUNCTION_SECRET>"}'::jsonb,
  body := '{}'::jsonb
);

-- Espera ~15s y revisa la respuesta
select status_code, content
from net._http_response
order by created desc
limit 1;
```

Respuesta esperada: `{"ok":true,"generadas":N}`

---

## Insertar una alerta manual (para alertas oficiales críticas)

Si detectas una alerta importante recién publicada que el pipeline aún no captó (Google News puede tardar horas en indexar), puedes insertarla a mano:

```sql
INSERT INTO alertas_epidemiologicas_ia
  (titulo, resumen, nivel, departamento, municipio, enfermedad, fuente_url, activa)
VALUES (
  'Título de la alerta',
  'Resumen breve del brote y la recomendación.',
  'warning',                 -- info | warning (naranja) | critical (rojo)
  'Cochabamba',
  'Cercado',
  'herpangina',
  'https://...',
  true
);
```

---

## Comportamiento ante "sin novedad local"

El filtro de Bolivia es **estricto a propósito**. Si en los últimos 15 días no hay noticias de brotes en Bolivia, la función devuelve `ok:false` y **no toca** las alertas existentes. Esto es lo correcto: es preferible mantener las últimas alertas válidas que mostrar alertas de otros países o vaciar la pantalla. Epidemiológicamente, que las alertas no cambien a diario es normal.

---

## Costos estimados

| Servicio | Uso | Costo |
|---|---|---|
| Google News RSS | ~150 requests/mes (5/día) | Gratis (sin API key) |
| Groq | ~30 llamadas/mes | Gratis (tier gratuito) |
| Supabase Edge Functions | ~30 invocaciones/mes | Gratis (límite: 500.000/mes) |
| Supabase DB | filas mínimas | Gratis |

**Total: $0/mes**

---

## Extensiones posibles

- **Más municipios/medios:** ampliar `BOLIVIA_TERMS` y `BOLIVIA_SOURCES` para mejorar la detección.
- **RSS directo de medios:** agregar feeds tipo `abi.bo/feed/` para fuentes confiables sin ruido.
- **Datos oficiales SNIS:** incorporar el boletín epidemiológico de `snis.minsalud.gob.bo` como fuente de oro.
- **Notificaciones push:** al insertar una alerta `critical` en el departamento del usuario, disparar push con Expo Notifications.
- **Vacunas por zona:** cruzar el departamento del usuario + brote activo para recomendar vacunas específicas.
- **Pantalla de admin:** que una autoridad publique alertas oficiales manualmente sin depender de la IA.
```
