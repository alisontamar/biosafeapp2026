# BioSafe — App de Gestión de Vacunación

Aplicación móvil desarrollada en React Native (Expo) para gestionar el esquema de vacunación del PAI Bolivia. Permite a padres/tutores llevar el historial de vacunas de sus hijos, y al personal de salud registrar dosis y consultar expedientes mediante escaneo de códigos QR.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Enrutamiento | Expo Router v6 (file-based) |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage) |
| Lenguaje | TypeScript |
| Navegación | React Navigation (bottom tabs + stack) |
| Cámara / QR | expo-camera v17 (`CameraView`) |
| Código QR generado | react-native-qrcode-svg |
| Archivos / Cámara | expo-image-picker, expo-document-picker |
| Gradientes | expo-linear-gradient |
| Iconos | @expo/vector-icons (Ionicons) |

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
- Recomendaciones de salud post-vacuna

#### Familia (`family`)
- Lista completa de pacientes vinculados al tutor
- Acceso al detalle de cada paciente

#### Detalle del paciente (`family/[id]`)
- Historial de vacunas aplicadas (con fecha, lote, origen)
- Vacunas pendientes según el esquema PAI Bolivia
- Botón para subir carnet físico (foto, galería o PDF)

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
- Almacenado en Supabase Storage (bucket `cartillas-fisicas`)
- Registrado en tabla `cartillas_fisicas_imagenes`

---

### Módulo Centro de Salud (`app/(healthTabs)/`)

Accesible para `Medico`, `Enfermero`, `Farmaceutico`.

#### Inicio (`dashboard`)
- Header con nombre, rol y botón de logout
- **Vacunación rápida**: selector de vacuna del catálogo PAI + botón "Escanear y aplicar"
- Botón secundario "Ver expediente" para escaneo sin pre-selección
- Stats del día: dosis aplicadas, pacientes atendidos, total del mes
- Historial de últimas 4 atenciones del día

#### Escanear QR — flujo completo (`scanner`)
- Cámara real con visor de escaneo (esquinas animadas en `#a281ba`)
- Verifica QR contra Supabase (valida `id_paciente` + `token`)
- Navega automáticamente al expediente del paciente

#### Vacunación rápida (`quick-scan`)
- Se accede desde el dashboard con una vacuna pre-seleccionada
- Muestra la vacuna en banner fijo mientras la cámara está activa
- Tras escanear: registra la dosis automáticamente en `dosis_aplicadas`
- Contador de dosis aplicadas en la sesión actual
- Opciones: "Siguiente paciente" (reinicia scanner) o "Finalizar"
- Maneja el error de dosis duplicada (`UNIQUE (id_paciente, id_vacuna)`)

#### Expediente del paciente (`patient-detail`)
- Tarjeta con nombre, edad, sexo, tutor vinculado
- Badge de embarazo (si aplica)
- **Vacunas pendientes** del esquema PAI (fondo amarillo)
- **Historial de dosis aplicadas** (con lote, fecha y origen del registro)
- Botón para registrar nueva dosis

#### Registrar dosis (`register-dose`)
- Picker con catálogo completo de vacunas PAI Bolivia
- Fecha de aplicación (editable)
- Número de lote (opcional)
- Fecha de próxima cita / refuerzo (opcional)
- Guarda en `dosis_aplicadas` con `origen_registro = 'Validado_En_Establecimiento'`
- Maneja constraint de dosis duplicada

#### Mis pacientes (`pacientes`)
- Lista de todos los pacientes atendidos por este trabajador (deduplicados)
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
- **Botón "Escanear Carnet QR"** (mismo flujo que Centro de Salud)
- Stats del establecimiento: personal asignado, dosis aplicadas
- Acciones rápidas: Nuevo Usuario, Ver Usuarios

#### Establecimientos (`establecimientos`)

**SuperAdmin:** Lista de todos los centros de salud y farmacias con fecha de registro. Botón para crear nuevo.

**AdminEstablecimiento:** Vista de solo su propio establecimiento (nombre, ciudad, tipo).

#### Crear establecimiento (`create-establishment`) — Solo SuperAdmin
- Nombre, ciudad/municipio, tipo (Centro de Salud / Farmacia)
- Guarda en tabla `establecimientos`

#### Usuarios (`usuarios`)
- Lista de usuarios con avatar coloreado por rol, nombre, correo, establecimiento
- Búsqueda por nombre o correo
- **SuperAdmin:** ve todos los usuarios del sistema
- **AdminEstablecimiento:** ve solo el personal de su establecimiento
- Botón para crear nuevo usuario

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
| `usuarios` | Todos los usuarios con rol y establecimiento asignado |
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
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Ejecutar en desarrollo

```bash
npm run dev
# o: npx expo start
```

### 4. Configurar Supabase

#### Storage bucket
Crear el bucket `cartillas-fisicas` con acceso público en:
`Supabase Dashboard → Storage → New Bucket`

Política RLS para uploads:
```sql
CREATE POLICY "authenticated_upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'cartillas-fisicas' AND auth.role() = 'authenticated'
);
```

#### Política RLS para creación de usuarios por admins
```sql
-- Permite al admin insertar usuarios en nombre de otros
CREATE POLICY "admins_can_insert_users" ON usuarios
FOR INSERT WITH CHECK (
  id_usuario = auth.uid()
  OR EXISTS (
    SELECT 1 FROM usuarios
    WHERE id_usuario = auth.uid()
    AND rol IN ('SuperAdmin', 'AdminEstablecimiento')
  )
);
```

### 5. Crear SuperAdmin inicial

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

## Estado del proyecto (junio 2026)

| Módulo | Estado |
|---|---|
| Autenticación y roles | Completo |
| Onboarding | Completo |
| Registro padre/tutor | Completo |
| Home tutor (QR, hijos, próxima vacuna) | Completo |
| Detalle hijo (historial PAI, carnet físico) | Completo |
| Centro de Salud — Scanner QR | Completo |
| Centro de Salud — Vacunación rápida | Completo |
| Centro de Salud — Expediente y registro de dosis | Completo |
| Administración — Dashboard y estadísticas | Completo |
| Administración — Gestión de establecimientos | Completo |
| Administración — Creación de usuarios con carnet | Completo |
| Scanner QR desde panel admin | Completo |
| Alertas epidemiológicas por IA | Estructura lista (datos de IA pendientes) |
| Educación (artículos/videos) | Estructura lista (contenido pendiente) |
