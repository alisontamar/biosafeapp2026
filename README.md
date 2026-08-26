# BioSafe — App de Gestión de Vacunación

Aplicación móvil desarrollada en React Native (Expo) para gestionar el esquema de vacunación del PAI Bolivia. Permite a padres/tutores llevar el historial de vacunas de sus hijos, y al personal de salud registrar dosis y consultar expedientes mediante escaneo de códigos QR.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Enrutamiento | Expo Router v6 (file-based) |
| Backend | 6 microservicios en Supabase Edge Functions (Deno) — ver [Arquitectura de microservicios](docs/ARQUITECTURA_MICROSERVICIOS.md) |
| DB | Supabase PostgreSQL (una sola base, RLS cerrado — solo `service_role` accede) |
| Auth | Supabase Auth |
| Lenguaje | TypeScript |
| Navegación | React Navigation (bottom tabs + stack) |
| Cámara / QR | expo-camera v17 (`CameraView`) |
| Código QR generado | react-native-qrcode-svg |
| Archivos / Cámara | expo-image-picker, expo-document-picker |
| Gradientes | expo-linear-gradient |
| Iconos | @expo/vector-icons (Ionicons) |
| Ubicación | expo-location (GPS + geocodificación inversa) |
| Clima | OpenMeteo API (gratis, sin API key) |
| IA / LLM | Groq API — modelo `openai/gpt-oss-20b` (texto) y `qwen/qwen3.6-27b` (visión, lectura de carnets) |

> **La app cliente ya no habla directo con la base de datos.** Toda la lógica de negocio vive en `supabase/functions/*-service/` y se llama desde `src/services/*.service.ts` vía `supabase.functions.invoke(...)`. El detalle completo de cada servicio, sus acciones y el porqué de esa arquitectura está en [`docs/ARQUITECTURA_MICROSERVICIOS.md`](docs/ARQUITECTURA_MICROSERVICIOS.md).

---

## Roles de usuario

La app tiene 6 roles con jerarquía:

```
SuperAdmin
  └── AdminEstablecimiento  (creado por SuperAdmin)
        └── Medico / Enfermero / Farmaceutico  (creados por AdminEstablecimiento)
        └── Tutor_PersonaNormal  (creado por AdminEstablecimiento o auto-registro)
```

| Rol | Descripción |
|---|---|
| `SuperAdmin` | Acceso total. Gestiona establecimientos y crea AdminEstablecimiento |
| `AdminEstablecimiento` | Administra su centro de salud. Crea personal y tutores. Puede escanear QR |
| `Medico` | Personal de salud. Escanea QR, registra dosis, acceso a expedientes |
| `Enfermero` | Igual que Médico |
| `Farmaceutico` | Igual que Médico |
| `Tutor_PersonaNormal` | Padre/tutor. Ve su historial y el de sus hijos. Genera QR propio |

---

## Funcionalidades por módulo

### Autenticación (`app/login`, `app/register`)

- **Login** con 3 tipos de cuenta: Padre/Tutor, Centro de Salud, Administración
- Validación cruzada: el tipo seleccionado debe coincidir con el rol en la base de datos
- **Registro** de Padre/Tutor (auto-registro):
  - Nombre completo, correo, contraseña
  - Fecha de nacimiento, sexo, indicador de embarazo (si aplica)
  - Genera automáticamente un carnet digital (registro en `pacientes`) con QR único
- Onboarding de 3 pantallas al primer uso
- Splash screen con animación

---

### Módulo Padre/Tutor (`app/(tabs)/`)

Accesible para `Tutor_PersonaNormal`.

#### Inicio (`home`)
- Muestra el carnet QR del titular de la cuenta con botón "Ver QR" y "Carnet"
- Próxima vacuna pendiente con contador de días
- Lista de hijos registrados con acceso rápido a QR y carnet físico
- Modal para añadir un hijo: nombre, fecha de nacimiento, sexo → genera QR automáticamente
- Al añadir hijo, opción de subir carnet físico antiguo
- **Recomendaciones de salud con IA** (ver sección [Integraciones IA](#integraciones-ia))

#### Familia (`family`)
- Lista completa de pacientes vinculados al tutor
- Acceso al detalle de cada paciente

#### Detalle del paciente (`family/[id]`)
- Historial de vacunas aplicadas (con fecha, lote, origen)
- Vacunas pendientes según el esquema PAI Bolivia
- Botón para subir carnet físico (foto, galería o PDF)
- Botón de editar (lápiz) para corregir nombre, fecha de nacimiento, sexo o embarazo del paciente

#### Educación (`education`)
- Artículos y videos educativos sobre vacunación

#### Alertas (`alerts`)
- Alertas epidemiológicas por IA (`alertas_epidemiologicas_ia`)

#### Mi QR (`qr`)
- Código QR del primer paciente vinculado al tutor
- Formato: `{ id_paciente, token }` codificado como JSON

#### Carnet físico (modal reutilizable)
- Subida de carnet de vacunación físico antiguo
- Soporta: foto con cámara, imagen de galería, archivo PDF
- La IA (Groq, vía `carnet-ocr-service`) extrae las dosis y se guardan en `dosis_aplicadas`
- **Nota:** la imagen/PDF original no se almacena — solo se usa para la extracción y se descarta. La tabla `cartillas_fisicas_imagenes` existe en el esquema pero no está en uso (pendiente si se decide guardar el archivo original)

---

### Módulo Centro de Salud (`app/(healthTabs)/`)

Accesible para `Medico`, `Enfermero`, `Farmaceutico`.

#### Inicio (`dashboard`)
- Header con nombre, rol y botón de logout
- **Vacunación rápida** — dos modos de escaneo:
  - **Modo 1 — Escanear y registrar**: selecciona vacuna del catálogo PAI → escanea QR → registra dosis automáticamente
  - **Modo 2 — Ver historial**: escanea QR sin pre-seleccionar vacuna → abre expediente con historial completo y botón "Agregar dosis"
- Stats del día: dosis aplicadas, pacientes atendidos, total del mes
- Historial de últimas 4 atenciones del día

#### Escanear QR — flujo completo (`scanner`)
- Cámara real con visor de escaneo (esquinas en `#a281ba`)
- Verifica QR contra Supabase (valida `id_paciente` + `token`)
- Navega automáticamente al expediente del paciente
- Recibe parámetro `grupo` para navegación correcta entre módulos

#### Vacunación rápida (`quick-scan`)
- Se accede desde el dashboard con una vacuna pre-seleccionada
- Muestra la vacuna en banner fijo mientras la cámara está activa
- Tras escanear: registra la dosis automáticamente en `dosis_aplicadas`
- Contador de dosis aplicadas en la sesión actual
- Opciones: "Siguiente paciente" (reinicia scanner) o "Finalizar"
- Maneja el error de dosis duplicada (`UNIQUE (id_paciente, id_vacuna)`)

#### Expediente del paciente (`patient-detail`)
- Tarjeta con nombre, edad, sexo, tutor vinculado
- Badges: embarazo, dosis aplicadas, vacunas pendientes
- **Vacunas pendientes** del esquema PAI con estado de urgencia:
  - Fondo amarillo: pendiente (muestra cuántos meses faltan para la edad recomendada)
  - Fondo rojo: **atrasada** (el paciente ya superó la edad ideal y no se aplicó)
- **Historial de dosis aplicadas** con fecha, lote, origen y **edad del paciente al momento de vacunarse**
- Botón "Agregar nueva dosis"
- Botón de editar (lápiz, header) para corregir datos del paciente
- Tap en una dosis aplicada → corregir fecha/lote/próxima cita o eliminarla (por si se registró mal)

#### Registrar dosis (`register-dose`)
- Picker con catálogo completo de vacunas PAI Bolivia
- Fecha de aplicación (editable)
- Número de lote (opcional)
- Fecha de próxima cita / refuerzo (opcional)
- Guarda en `dosis_aplicadas` con `origen_registro = 'Validado_En_Establecimiento'`
- Maneja constraint de dosis duplicada

#### Mis pacientes (`pacientes`)
- Lista de todos los pacientes atendidos por este trabajador (deduplicados)
- Se actualiza automáticamente al volver a la pestaña (`useFocusEffect`)
- Incluye hijos de tutores atendidos, no solo adultos
- Búsqueda por nombre
- Tap en paciente → abre expediente

#### Perfil (`perfil`)
- Nombre, rol, correo, establecimiento asignado
- Botón de cerrar sesión

---

### Módulo Administración (`app/(adminTabs)/`)

Accesible para `SuperAdmin` y `AdminEstablecimiento`.

#### Inicio (`dashboard`)

**SuperAdmin:**
- Stats globales: cantidad de establecimientos, usuarios, pacientes y dosis
- Acciones rápidas: Nuevo Centro, Nuevo Usuario, Ver Usuarios, Ver Centros

**AdminEstablecimiento:**
- Nombre e info del establecimiento asignado
- **Vacunación rápida** — dos modos de escaneo (igual que Centro de Salud):
  - **Modo 1 — Escanear y registrar**: selecciona vacuna del catálogo PAI → escanea QR → registra dosis automáticamente
  - **Modo 2 — Ver historial**: escanea sin pre-seleccionar → abre expediente completo del paciente
- Stats del establecimiento: personal asignado, dosis aplicadas
- Acciones rápidas: Nuevo Usuario, Ver Usuarios

#### Establecimientos (`establecimientos`)

**SuperAdmin:** Lista de todos los centros de salud y farmacias con fecha de registro. Botón para crear nuevo. Tap en un centro → editar sus datos o eliminarlo (bloqueado si todavía tiene personal asignado).

**AdminEstablecimiento:** Vista de solo su propio establecimiento (nombre, ciudad, tipo).

#### Crear establecimiento (`create-establishment`) — Solo SuperAdmin
- Nombre, ciudad/municipio, tipo (Centro de Salud / Farmacia)
- Guarda en tabla `establecimientos`

#### Catálogo de vacunas (`catalogo-vacunas`) — Solo SuperAdmin
- Lista del esquema PAI Bolivia (`cat_vacunas_oficiales`)
- Crear, editar y eliminar vacunas del catálogo (nombre, número de dosis, edad ideal en meses)
- No se puede eliminar una vacuna si ya hay dosis aplicadas registradas con ella

#### Usuarios (`usuarios`)
- Lista de usuarios con avatar coloreado por rol, nombre, correo, establecimiento
- Búsqueda por nombre o correo
- **SuperAdmin:** ve todos los usuarios del sistema
- **AdminEstablecimiento:** ve solo el personal de su establecimiento
- Botón para crear nuevo usuario
- Tap en un usuario → editar nombre/rol, activar/desactivar la cuenta (bloquea el acceso sin borrar historial), o eliminarla definitivamente (no disponible para tutores, para no dejar huérfanos a sus hijos — en ese caso solo se puede desactivar)

#### Crear usuario (`create-user`)
- Nombre, correo, contraseña temporal, rol (limitado según quien crea)
- Crea cuenta en Supabase Auth sin cerrar la sesión del admin (cliente temporal sin sesión persistente)
- Inserta en tabla `usuarios`

Para `Tutor_PersonaNormal` también aparecen:
- **Fecha de nacimiento** (AAAA-MM-DD)
- **Sexo** (Masculino / Femenino)
- **¿Está embarazada?** (Switch, solo si sexo = Femenino)
- Crea además el registro en `pacientes` con QR único generado automáticamente

Para personal de salud / admin: selector de establecimiento (SuperAdmin elige de lista, AdminEstablecimiento asigna el suyo automáticamente).

#### Perfil (`perfil`)
- Nombre, rol, correo, establecimiento
- Botón de cerrar sesión

---

## Estructura de navegación

```
app/
├── index.tsx               → Redirige a /splash
├── splash.tsx              → SplashScreen (1.5s → /onboarding)
├── onboarding.tsx          → OnboardingScreen (3 slides → /login)
├── login.tsx               → LoginScreen
├── register.tsx            → RegisterScreen
│
├── (tabs)/                 → Tutor_PersonaNormal
│   ├── home.tsx
│   ├── family.tsx
│   ├── family/[id].tsx     (href: null)
│   ├── education.tsx
│   ├── alerts.tsx
│   └── qr.tsx
│
├── (healthTabs)/           → Medico / Enfermero / Farmaceutico
│   ├── dashboard.tsx
│   ├── scanner.tsx
│   ├── pacientes.tsx
│   ├── perfil.tsx
│   ├── patient-detail.tsx  (href: null)
│   ├── register-dose.tsx   (href: null)
│   └── quick-scan.tsx      (href: null)
│
└── (adminTabs)/            → SuperAdmin / AdminEstablecimiento
    ├── dashboard.tsx
    ├── establecimientos.tsx
    ├── usuarios.tsx
    ├── perfil.tsx
    ├── create-user.tsx         (href: null)
    ├── create-establishment.tsx (href: null)
    ├── catalogo-vacunas.tsx    (href: null, solo SuperAdmin)
    ├── scanner.tsx             (href: null)
    ├── patient-detail.tsx      (href: null)
    ├── register-dose.tsx       (href: null)
    └── quick-scan.tsx          (href: null)
```

---

## Base de datos (Supabase)

### Tablas principales

| Tabla | Descripción |
|---|---|
| `establecimientos` | Centros de salud y farmacias del sistema |
| `usuarios` | Todos los usuarios con rol, establecimiento asignado y estado (`activo`) |
| `pacientes` | Expedientes clínicos con código QR único |
| `cat_vacunas_oficiales` | Catálogo maestro del esquema PAI Bolivia |
| `dosis_aplicadas` | Historial transaccional de vacunación |
| `cartillas_fisicas_imagenes` | URLs de carnets físicos subidos a Storage |
| `alertas_epidemiologicas_ia` | Alertas generadas por IA para establecimientos |

### Tipos ENUM

```sql
tipo_establecimiento: 'Centro de Salud' | 'Farmacia'
rol_usuario: 'SuperAdmin' | 'AdminEstablecimiento' | 'Medico' | 'Enfermero' | 'Farmaceutico' | 'Tutor_PersonaNormal'
origen_dosis: 'Validado_En_Establecimiento' | 'Migrado_Cartilla_Fisica'
```

---

## Configuración inicial

### 1. Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=tu_anon_key
EXPO_PUBLIC_GROQ_API_KEY=tu_groq_api_key
```

> **Nota:** El prefijo `EXPO_PUBLIC_` es obligatorio para que Expo incluya la variable en el bundle del cliente.

### 2. Instalar dependencias

```bash
npm install
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
# o: npx expo start
```

### 4. Desplegar los microservicios (Supabase Edge Functions)

La app no funciona sin esto — toda la lectura/escritura de datos pasa por estas funciones (ver [`docs/ARQUITECTURA_MICROSERVICIOS.md`](docs/ARQUITECTURA_MICROSERVICIOS.md)):

```bash
supabase link --project-ref tu-project-ref
supabase functions deploy usuarios-service --project-ref tu-project-ref
supabase functions deploy pacientes-vacunacion-service --project-ref tu-project-ref
supabase functions deploy establecimientos-service --project-ref tu-project-ref
supabase functions deploy carnet-ocr-service --project-ref tu-project-ref
supabase functions deploy alertas-service --project-ref tu-project-ref
supabase functions deploy dashboard-service --project-ref tu-project-ref
```

Secrets que necesitan las funciones (`supabase secrets set NOMBRE=valor --project-ref tu-project-ref`):

| Secret | Usado por |
|---|---|
| `GROQ_API_KEY` | `carnet-ocr-service`, `generate-alerts` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | todos los servicios (Supabase los inyecta automáticamente) |

### 5. RLS y permisos de las tablas

Las tablas de negocio (`usuarios`, `pacientes`, `dosis_aplicadas`, `establecimientos`, `cat_vacunas_oficiales`, `alertas_epidemiologicas_ia`) tienen RLS activo **sin políticas** — nadie puede leer/escribir directo, ni siquiera con la anon key. Solo las Edge Functions (con `service_role`, que bypassa RLS) pueden tocarlas. Ver la migración `supabase/migrations/20260825_lockdown_rls_microservicios.sql`. No hace falta (ni se debe) agregar policies de RLS para que la app funcione — si algo nuevo necesita acceso a una tabla, se agrega como acción al microservicio dueño de esa tabla.

### 6. Crear SuperAdmin inicial

Ejecutar en el SQL Editor de Supabase después de crear el usuario en Authentication:

```sql
INSERT INTO usuarios (id_usuario, nombre_completo, correo_electronico, rol, password_hash)
VALUES (
  'uuid-del-usuario-en-auth',
  'Nombre del SuperAdmin',
  'correo@ejemplo.com',
  'SuperAdmin',
  ''
);
```

---

## Color principal

`#a281ba` — Todos los elementos de acento, botones primarios, tab activo y marcadores QR usan este color en los tres módulos.

---

## Integraciones IA

### Alertas epidemiológicas (pestaña Alertas — tutor)

Pipeline automático que corre **una vez al día** vía Supabase Edge Function + cron (lado escritura, `generate-alerts`):

1. **Google News RSS** busca noticias de salud en medios y fuentes oficiales de Bolivia (gratis, sin API key, casi en tiempo real).
2. **Groq** (`openai/gpt-oss-20b`) sintetiza 2–4 alertas en español con nivel `info | warning | critical`, y extrae departamento/municipio/enfermedad para geolocalizar el brote.
3. Las alertas anteriores se desactivan y se insertan las nuevas en `alertas_epidemiologicas_ia`.
4. La app lee las alertas a través de `alertas-service` (acciones `listarActivas` / `obtenerAlertaCercana`), que también arma la tarjeta "Brote cerca de ti" en Home según el departamento del usuario.

Archivos: `supabase/functions/generate-alerts/index.ts` (escritura) · `supabase/functions/alertas-service/index.ts` (lectura) · Migraciones: `supabase/migrations/20260608_alertas_ia.sql`, `20260630_alertas_geo.sql`

**Documentación técnica detallada:** [`supabase/functions/generate-alerts/README.md`](supabase/functions/generate-alerts/README.md)

---

### Recomendaciones de salud (Home — tutor)

Al abrir la app, el módulo de recomendaciones sigue este flujo:

1. **Permiso de ubicación** — Se muestra una modal personalizada explicando el uso antes de solicitar el permiso del sistema operativo.
2. **Obtener ubicación** — GPS si el permiso fue otorgado; fallback a geolocalización por IP (`ip-api.com`); fallback final a La Paz (lat `-16.5`, lon `-68.15`).
3. **Clima actual** — Consulta a OpenMeteo API (gratuita, sin API key). Obtiene temperatura, sensación térmica, código WMO del clima y velocidad del viento.
4. **Contexto familiar** — Detecta si el tutor tiene bebés (<12 meses), niños (12–144 meses) o si el titular está embarazado.
5. **Generación con Groq** — Envía clima + contexto familiar al modelo `openai/gpt-oss-20b` y recibe 4 tarjetas `{ icono, titulo, descripcion }` en JSON. Si el LLM falla, se usan tarjetas de fallback estáticas.
6. **Cadencia de refresco** — Solo cuando la app vuelve del fondo (`AppState: background → active`), no en cada cambio de pestaña.

Iconos disponibles para las tarjetas: `sunny`, `rainy`, `cold`, `hot`, `wind`, `baby`, `child`, `pregnant`, `shield`, `medical`.

---

## Estado del proyecto (2026-08-25)

| Módulo | Estado |
|---|---|
| Migración a microservicios (6 Edge Functions + RLS cerrado) | Completo |
| Autenticación y roles | Completo |
| Onboarding | Completo |
| Registro padre/tutor | Completo |
| Home tutor (QR, hijos, próxima vacuna) | Completo |
| Detalle hijo (historial PAI, carnet físico, editar datos) | Completo |
| Centro de Salud — Scanner QR | Completo |
| Centro de Salud — Vacunación rápida | Completo |
| Centro de Salud — Expediente, registro y corrección de dosis | Completo |
| Administración — Dashboard y estadísticas | Completo |
| Administración — Gestión de establecimientos (crear/editar/eliminar) | Completo |
| Administración — Gestión de usuarios (crear/editar/activar-desactivar/eliminar) | Completo |
| Administración — Catálogo de vacunas (crear/editar/eliminar) | Completo |
| Scanner QR desde panel admin | Completo |
| Recomendaciones de salud con IA (Home) | Completo |
| Alertas epidemiológicas por IA (Google News RSS + Groq) | Completo |
| Educación (artículos/videos) | Estructura lista (contenido pendiente) |
| Recuperar contraseña ("olvidé mi contraseña") | Pendiente |
| Editar perfil propio (nombre/correo/contraseña) | Pendiente |
| Subir y conservar la imagen original del carnet físico | Pendiente (hoy solo se extraen los datos, no se guarda el archivo) |
| Auto-login por sesión persistente al abrir la app | Deshabilitado a propósito (etapa de desarrollo, un solo dispositivo para probar todos los roles) |
