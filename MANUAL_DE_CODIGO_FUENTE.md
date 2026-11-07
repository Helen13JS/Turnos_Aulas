# UNIVERSIDAD MAYOR, REAL Y PONTIFICIA DE SAN FRANCISCO XAVIER DE CHUQUISACA
## FACULTAD DE TECNOLOGÍA
### CARRERA DE INGENIERÍA DE SISTEMAS / CIENCIAS DE LA COMPUTACIÓN

---

# MANUAL TÉCNICO DE CÓDIGO FUENTE Y ARQUITECTURA DE SOFTWARE
## Sistema de Gestión de Turnos, Recursos y Asignación de Aulas (Aulas U)

* **Asignatura / Modalidad:** SHC131 - Taller de Especialidad / Proyecto de Grado
* **Autor / Desarrollador:** Postulante a Grado Académico
* **Docente Guía / Tribunal:** Comisión de Evaluación de Grado
* **Versión del Sistema:** 2.4.0 (Blindada para Defensa de Grado)
* **Pila Tecnológica:** Node.js (v20+), Express, PostgreSQL (v14+), React (v18+), Vite, CSS3/Tailwind
* **Fecha de Emisión:** Noviembre de 2026
* **Sucre — Bolivia**

---

## TABLA DE CONTENIDOS

1. [INTRODUCCIÓN Y PROPÓSITO DEL MANUAL](#1-introducción-y-propósito-del-manual)
2. [ARQUITECTURA GENERAL DEL SISTEMA](#2-arquitectura-general-del-sistema)
   - 2.1 Visión General de la Arquitectura
   - 2.2 Diagrama Arquitectónico C4 (Contenedores)
   - 2.3 Flujo de Comunicación Cliente - Servidor
   - 2.4 Modelo de Concurrencia y Bloqueo Pesimista
3. [ESTRUCTURA INTEGRAL DEL REPOSITORIO](#3-estructura-integral-del-repositorio)
   - 3.1 Estructura del Backend (`Backend/`)
   - 3.2 Estructura del Frontend (`Frontend/`)
4. [MODELO DE DATOS Y PERSISTENCIA (POSTGRESQL)](#4-modelo-de-datos-y-persistencia-postgresql)
   - 4.1 Diagrama Entidad-Relación y Jerarquías Clave
   - 4.2 Diccionario de Tablas Principales
   - 4.3 Triggers de Integridad Concurrente y Reglas de Negocio
5. [ARQUITECTURA Y MÓDULOS DEL BACKEND (NODE.JS / EXPRESS)](#5-arquitectura-y-módulos-del-backend-nodejs--express)
   - 5.1 Configuración del Servidor y Variables de Entorno (`.env`)
   - 5.2 Capa de Middlewares de Seguridad y Control de Acceso
   - 5.3 Módulo de Autenticación y Control de Sesiones (`auth`)
   - 5.4 Módulo de Infraestructura Física (`infraestructura`)
   - 5.5 Módulo Académico y Cargas Horarias (`academico`)
   - 5.6 Módulo de Planificación de Horarios y Reservas (`horarios`)
   - 5.7 Módulo de Solicitudes y Workflow de Aprobación (`solicitudes`)
   - 5.8 Módulo de Personas y Expedientes (`personas`)
   - 5.9 Capa de Utilidades Críticas y Manejo de Errores
6. [ARQUITECTURA Y COMPONENTES DEL FRONTEND (REACT / VITE)](#6-arquitectura-y-componentes-del-frontend-react--vite)
   - 6.1 Configuración, Rutas y Ciclo de Vida
   - 6.2 Contexto de Autenticación y Autorización (`AuthContext.jsx`)
   - 6.3 Capa de Clientes HTTP y Servicios API
   - 6.4 Módulo de Asignación y Planificador Interactivo (`Asignacion/`)
   - 6.5 Módulo de Aulas y Mantenimiento Físico (`Aulas/`)
   - 6.6 Módulo de Horarios y Portal Institucional (`Horarios/`)
   - 6.7 Módulo de Gestión Curricular (`Academico/`)
   - 6.8 Módulo de Administración y Seguridad (`Configuracion/`)
   - 6.9 Navegación Global y Barra Lateral (`Layout/ModuleSidebar.jsx`)
7. [POLÍTICAS DE SEGURIDAD, CONTROL DE ACCESO Y PRIVACIDAD](#7-políticas-de-seguridad-control-de-acceso-y-privacidad)
   - 7.1 Matriz de Control de Acceso Basado en Roles (RBAC)
   - 7.2 Territorialidad y Restricción por Dirección de Carrera
   - 7.3 Protección de Datos Personales Sensibles
   - 7.4 Bloqueo Estricto de Usuarios Inactivos y Suspendidos
8. [CATÁLOGO DE ENDPOINTS DE LA API REST](#8-catálogo-de-endpoints-de-la-api-rest)
9. [GUÍA DE DESPLIEGUE, PUESTA EN MARCHA Y VERIFICACIÓN](#9-guía-de-despliegue-puesta-en-marcha-y-verificación)
10. [GUÍA DE MANTENIMIENTO, EXTENSIBILIDAD Y BUENAS PRÁCTICAS](#10-guía-de-mantenimiento-extensibilidad-y-buenas-prácticas)

---

# 1. INTRODUCCIÓN Y PROPÓSITO DEL MANUAL

El **Sistema de Gestión de Turnos, Recursos y Asignación de Aulas para la USFX ("Aulas U")** es una plataforma tecnológica integral diseñada para resolver la problemática de optimización, planificación horaria, administración de infraestructura física y control de ocupación en unidades académicas de educación superior.

### 1.1 Objetivo del Documento
El presente documento constituye el **Manual Técnico de Código Fuente y Arquitectura**, concebido como una referencia exhaustiva de ingeniería de software para el tribunal evaluador, desarrolladores de mantenimiento, auditores de sistemas y administradores universitarios. Su propósito es describir con precisión matemática y arquitectónica el funcionamiento interno de cada módulo, controlador, servicio, componente de interfaz de usuario, disparador de base de datos y mecanismo de sincronización concurrente.

### 1.2 Alcance del Sistema
El sistema proporciona:
1. **Planificación Asistida de Horarios:** Asignación matricial (Día × Bloque de 30 minutos) con control estricto de cuotas horarias semanales (teoría, laboratorio y práctica) y prevención nativa de colisiones espaciales y de docentes.
2. **Gestión Jerárquica de Infraestructura:** Registro y mantenimiento de Pabellones, Pisos, Aulas y Recursos Tecnológicos asociados (proyectores, climatización, pizarras, terminales).
3. **Control de Acceso Territorial (RBAC + Direcciones):** Esquema de seguridad de tres niveles canónicos (*Super Administrador*, *Director de Carrera* y *Visualizador Institucional*), donde los directores solo pueden escribir en registros académicos de su propia Dirección Departamental.
4. **Validación Bidireccional de Reservas Temporales:** Detección de incompatibilidades en tiempo real entre clases regulares de gestión y eventos transitorios/exámenes en aulas universitarias.
5. **Transaccionalidad en Cambios Aprobados:** Ejecución atómica de reasignaciones de aula tras la resolución favorable de solicitudes cursadas por docentes.

---

# 2. ARQUITECTURA GENERAL DEL SISTEMA

## 2.1 Visión General de la Arquitectura
El sistema adopta un patrón arquitectónico en capas (**Layered Architecture**) desacoplado en dos capas físicas principales: **Frontend Single Page Application (SPA)** y **Backend API RESTful**, soportado por un motor relacional transaccional **PostgreSQL**.

```
┌────────────────────────────────────────────────────────┐
│                   CAPA DE PRESENTACIÓN                 │
│         React 18 + Vite + Context API + Lucide         │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / JSON (JWT HS256)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   CAPA DE APLICACIÓN                   │
│        Node.js + Express 4.x (Routing & Controllers)   │
├────────────────────────────────────────────────────────┤
│                     CAPA DE NEGOCIO                    │
│     Services (Lógica de Dominio, RBAC, Cargas, Cupos)  │
├────────────────────────────────────────────────────────┤
│                 CAPA DE ACCESO A DATOS                 │
│         pg Pool (Conexiones parametrizadas y Locks)    │
└───────────────────────────┬────────────────────────────┘
                            │ Conexión TCP / Socket UNIX
                            ▼
┌────────────────────────────────────────────────────────┐
│                 CAPA DE PERSISTENCIA                   │
│      PostgreSQL 14+ (Triggers P0001, Locks, Vistas)    │
└────────────────────────────────────────────────────────┘
```

## 2.2 Diagrama Arquitectónico C4 (Contenedores)

```mermaid
flowchart TD
    subgraph Cliente["Navegador Web del Cliente"]
        UI["SPA React / Vite\n(Puerto 5173 / Nginx)"]
        AUTH_CTX["AuthContext / Axios Interceptors"]
        GRID["Motor Grilla Planificador & Mapa"]
    end

    subgraph Backend_App["Servidor de Aplicación (Node.js)"]
        EXPRESS["Express Router / app.js\n(Puerto 3000)"]
        MW_AUTH["verifyToken & verifyRole"]
        MW_TERRITORY["careerAuthorization\n(Validación Territorial)"]
        SERVICES["Servicios de Dominio\n(Horarios, Aulas, Académico, Solicitudes)"]
        PG_PARSER["pgErrorParser\n(Mapeo P0001 -> 409 Conflict)"]
    end

    subgraph Base_Datos["Motor de Persistencia (PostgreSQL)"]
        PG_POOL["Pool de Conexiones (pg.Pool)"]
        LOCK_FUNC["bloquear_calendario()\npg_advisory_xact_lock"]
        TABLAS["Tablas Maestras (69 tablas)\nhorario_clase, aula, persona, usuario"]
        TRIGGERS["Triggers de Integridad\ntrg_99_integridad_calendario"]
    end

    UI -->|Peticiones HTTP REST| EXPRESS
    EXPRESS --> MW_AUTH
    MW_AUTH --> MW_TERRITORY
    MW_TERRITORY --> SERVICES
    SERVICES --> PG_PARSER
    SERVICES -->|Transacciones BEGIN/COMMIT| PG_POOL
    PG_POOL --> LOCK_FUNC
    PG_POOL --> TABLAS
    TABLAS --> TRIGGERS
```

## 2.3 Flujo de Comunicación Cliente - Servidor
1. **Autenticación:** El usuario envía credenciales (`email`, `password`) a `POST /api/auth/login`. El backend autentica mediante `bcrypt.compare`, valida que `id_estado_usr === 1` ('Activo'), registra la sesión en `sesion_jwt` y firma un JWT de 8 horas con claims (`userId`, `rol`, `id_direccion`, `jti`).
2. **Intercambio Seguro:** El frontend almacena el token en `localStorage` y lo incluye en cada cabecera HTTP: `Authorization: Bearer <token>`.
3. **Inspección de Validez:** En cada llamada protegida, `verifyToken` consulta la tabla `sesion_jwt` para certificar que el token no haya sido revocado en el servidor y que la cuenta permanezca en estado activo.
4. **Filtro Territorial:** Si el usuario es `ROLE_DIRECTOR_CARRERA`, el middleware `authorizeCareerWrites` intercepta la solicitud antes de ejecutar cualquier escritura (`POST`, `PUT`, `DELETE`), verificando que los identificadores de grupo, plan o materia pertenezcan a las carreras adscritas a su Dirección.
5. **Aislamiento Concurrente:** Dentro de la transacción, el servicio ejecuta `SELECT bloquear_calendario()` antes de manipular registros del calendario universitario.
6. **Captura y Respuesta:** Si se genera una violación de choque de aula, choque de docente o cuota semanal, PostgreSQL dispara un error `SQLSTATE P0001`, el cual es capturado por `pgErrorParser.js` y retornado al cliente con código HTTP `409 Conflict` y un mensaje semántico claro.

## 2.4 Modelo de Concurrencia y Bloqueo Pesimista
El sistema previene la condición de carrera (**race condition**) en la asignación simultánea de aulas mediante un cerrojo consultivo de transacción a nivel de base de datos:
* **Función nativa:** `bloquear_calendario()` ejecuta `PERFORM pg_advisory_xact_lock(hashtext('calendario_academico'))`.
* **Garantía:** Toda operación concurrente de escritura sobre `horario_clase`, `asignacion_docente` o `reserva_temporal` espera a que la transacción activa confirme (`COMMIT`) o aborte (`ROLLBACK`). De esta forma se eliminan los falsos positivos por lecturas fantasma o inserciones intermedias no confirmadas.

---

# 3. ESTRUCTURA INTEGRAL DEL REPOSITORIO

La estructura física del repositorio mantiene una rigurosa separación de responsabilidades:

```
Proyecto_Aulas/
├── Backend/
│   ├── migrations/                  # Scripts SQL de evolución de esquema
│   │   ├── 001_bloques_30min.sql
│   │   ├── 002_cargas_horarias.sql
│   │   ├── 003_direcciones_carrera.sql
│   │   ├── 004_cuota_estricta.sql
│   │   └── 005_integridad_concurrente.sql
│   ├── src/
│   │   ├── config/                  # Conexión DB y variables globales
│   │   │   ├── db.js
│   │   │   └── index.js
│   │   ├── middlewares/             # Capa interceptora de peticiones
│   │   │   ├── authMiddleware.js
│   │   │   ├── careerAuthorization.js
│   │   │   ├── corsOptions.js
│   │   │   ├── errorHandler.js
│   │   │   └── notFound.js
│   │   ├── modules/                 # Arquitectura modular de dominio
│   │   │   ├── academico/
│   │   │   ├── auth/
│   │   │   ├── automatizacion/
│   │   │   ├── horarios/
│   │   │   ├── infraestructura/
│   │   │   ├── notificaciones/
│   │   │   ├── personas/
│   │   │   └── solicitudes/
│   │   ├── utils/                   # Librerías auxiliares compartidas
│   │   │   ├── choqueDocente.js
│   │   │   ├── domainValidation.js
│   │   │   ├── periodoActivo.js
│   │   │   ├── pgErrorParser.js
│   │   │   └── roles.js
│   │   ├── app.js                   # Ensamblador de middlewares y routers Express
│   │   └── server.js                # Punto de entrada HTTP y servicios daemon
│   ├── .env                         # Parámetros del entorno de ejecución
│   ├── .env.example                 # Plantilla base de configuración
│   ├── package.json                 # Dependencias y scripts del backend
│   └── seed_*.js                    # Scripts de inicialización institucional
│
├── Frontend/
│   ├── src/
│   │   ├── components/              # Vistas y componentes visuales del sistema
│   │   │   ├── Academico/           # Módulo de carreras, planes, materias y cargas
│   │   │   ├── Asignacion/          # Módulo de distributivo y grilla interactiva
│   │   │   ├── Aulas/               # Módulo de pabellones, pisos, aulas y mapa
│   │   │   ├── Configuracion/       # Módulo RBAC, usuarios, catálogos y perfil
│   │   │   ├── Horarios/            # Grilla semanal general y portal de consulta
│   │   │   ├── Layout/              # Estructura visual común (ModuleSidebar)
│   │   │   └── Login/               # Pantalla de inicio de sesión
│   │   ├── context/                 # Estado global de la aplicación (AuthContext)
│   │   ├── services/                # Clientes Axios / Fetch tipados
│   │   │   ├── api.service.js
│   │   │   ├── aulas.service.js
│   │   │   ├── auth.service.js
│   │   │   └── configuracion.service.js
│   │   ├── utils/                   # Funciones utilitarias del cliente
│   │   │   ├── horarioSlots.js
│   │   │   └── roles.js
│   │   ├── App.jsx                  # Enrutador de vistas (React Router DOM)
│   │   ├── main.jsx                 # Montaje en el DOM raíz (index.html)
│   │   └── index.css                # Estilos globales de interfaz
│   ├── index.html                   # HTML ancla de la SPA
│   ├── package.json                 # Manifiesto de dependencias npm
│   └── vite.config.js               # Configuración del bundler Vite
│
├── artifacts/                       # Evidencia de auditoría técnica y diagnósticos
└── MANUAL_DE_CODIGO_FUENTE.md       # Presente manual técnico
```

---

# 4. MODELO DE DATOS Y PERSISTENCIA (POSTGRESQL)

El modelo de datos cuenta con **69 tablas relacionales**, gobernadas por claves foráneas con reglas `ON DELETE RESTRICT` para preservar la trazabilidad institucional.

## 4.1 Diagrama Entidad-Relación y Jerarquías Clave

```mermaid
erDiagram
    DIRECCION_ACADEMICA ||--o{ DIRECCION_CARRERA : agrupa
    DIRECCION_CARRERA ||--o{ PLAN_ESTUDIO : tiene
    PLAN_ESTUDIO ||--o{ MATERIA_PLAN : define
    MATERIA ||--o{ MATERIA_PLAN : incluye
    MATERIA ||--o{ MATERIA_CARGA_HORARIA : estipula
    MATERIA_PLAN ||--o{ GRUPO_MATERIA : oferta
    PERIODO_ACADEMICO ||--o{ GRUPO_MATERIA : programa

    GRUPO_MATERIA ||--o{ ASIGNACION_DOCENTE : asigna
    DOCENTE ||--o{ ASIGNACION_DOCENTE : dicta
    PERSONA ||--|| DOCENTE : identifica
    PERSONA ||--|| USUARIO : posee
    ESTADO_USUARIO ||--o{ USUARIO : categoriza

    PABELLON ||--o{ PISO : contiene
    PISO ||--o{ AULA : aloja
    ESTADO_AULA ||--o{ AULA : clasifica
    TIPO_AULA ||--o{ AULA : tipifica

    GRUPO_MATERIA ||--o{ HORARIO_CLASE : imparte
    AULA ||--o{ HORARIO_CLASE : ocupa
    DIA_SEMANA ||--o{ HORARIO_CLASE : fija
    BLOQUE_HORARIO ||--o{ HORARIO_CLASE : fracciona
    TIPO_CLASE ||--o{ HORARIO_CLASE : diferencia

    DIRECTOR_CARRERA ||--o{ RESERVA_TEMPORAL : efectua
    AULA ||--o{ RESERVA_TEMPORAL : reserva
    BLOQUE_HORARIO ||--o{ RESERVA_TEMPORAL : comprende
```

## 4.2 Diccionario de Tablas Principales

### 1. `horario_clase` (Planificación Oficial de Clases)
Contiene la asignación definitiva de un grupo a un espacio físico en un momento exacto de la semana.
* `id_horario` (SERIAL, PK): Identificador único del bloque programado.
* `id_grupo` (INT, FK -> `grupo_materia`): Grupo académico asociado.
* `id_aula` (INT, FK -> `aula`): Aula asignada.
* `id_dia` (INT, FK -> `dia_semana`): Día de la semana (1 = Lunes a 6 = Sábado).
* `id_bloque` (INT, FK -> `bloque_horario`): Franja horaria de 30 minutos (07:00 a 22:00).
* `id_tipo_clase` (INT, FK -> `tipo_clase`): Tipología de la sesión (1 = Teoría, 2 = Práctica, 3 = Laboratorio).

### 2. `aula` (Espacios Físicos Universitaros)
* `id_aula` (SERIAL, PK): Identificador del aula.
* `id_piso` (INT, FK -> `piso`): Piso al que pertenece.
* `id_tipo_espacio` (INT, FK -> `tipo_aula`): Tipo físico (Aula Magna, Lab Cómputo, Teórica).
* `id_estado_espacio` (INT, FK -> `estado_aula`): Estado (1 = Disponible / Activa, 2 = En mantenimiento).
* `nombre_codigo` (VARCHAR): Código identificativo visible (ej. "Aula 101", "Lab B-201").
* `capacidad_maxima` (INT): Cupo máximo de estudiantes sentados.
* `coord_x`, `coord_y` (NUMERIC): Coordenadas esquemáticas opcionales para plano digital.

### 3. `materia_carga_horaria` (Restricción de Cuotas Semanales)
* `id_carga` (SERIAL, PK): Identificador de la carga.
* `id_materia` (INT, FK -> `materia`): Materia universitaria.
* `id_tipo_clase` (INT, FK -> `tipo_clase`): Tipo de sesión.
* `horas_semana` (NUMERIC): Total de horas académicas permitidas por semana para este tipo de clase.

### 4. `reserva_temporal` (Eventos Transitorios y Exámenes)
* `id_reserva` (SERIAL, PK): Identificador de la reserva.
* `id_director` (INT, FK -> `director_carrera`): Director que reservó el espacio.
* `id_aula` (INT, FK -> `aula`): Espacio solicitado.
* `id_periodo` (INT, FK -> `periodo_academico`): Periodo lectivo vigente.
* `id_dia` (INT, FK -> `dia_semana`): Día asignado.
* `id_bloque` (INT, FK -> `bloque_horario`): Bloque solicitado.
* `fecha_reserva` (DATE): Fecha exacta de realización.
* `motivo` (TEXT): Razón institucional del evento.

### 5. `usuario` (Cuentas del Sistema)
* `id_usuario` (SERIAL, PK): Identificador de cuenta.
* `id_persona` (INT, FK -> `persona`, UNIQUE): Identidad civil vinculada.
* `id_estado_usr` (INT, FK -> `estado_usuario`): Estado de la cuenta (1 = Activo, 2 = Inactivo, 3 = Suspendido).
* `email` (VARCHAR, UNIQUE): Correo electrónico institucional de acceso.
* `password_hash` (VARCHAR): Hash bcrypt de la contraseña.
* `rol` (VARCHAR): Rol canónico asignado (`ROLE_SUPER_ADMIN`, `ROLE_DIRECTOR_CARRERA`, `ROLE_VISUALIZADOR`).
* `id_direccion` (INT, FK -> `direccion_academica`, Nullable): Dirección que comanda el usuario (requerido si es Director).

## 4.3 Triggers de Integridad Concurrente y Reglas de Negocio
Implementados en el script [005_integridad_concurrente.sql](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/migrations/005_integridad_concurrente.sql):
* `trg_00_bloquear_calendario`: Disparador `BEFORE INSERT OR UPDATE OR DELETE` ejecutado sobre las tablas del calendario que adquiere el cerrojo consultivo de transacción (`pg_advisory_xact_lock`).
* `trg_99_integridad_calendario`: Disparador `AFTER INSERT OR UPDATE OR DELETE` que valida de forma atómica:
  1. Que la fecha de una reserva corresponda al día de semana seleccionado (`ISODOW`).
  2. Que no existan dos clases solapadas en la misma aula, día, bloque y período (`Choque de aula`).
  3. Que no existan dos clases del mismo grupo en horarios solapados (`Choque de grupo`).
  4. Que un docente no tenga dos clases asignadas en aulas distintas a la misma hora (`Choque de docente`).
  5. Que un aula con horario regular de clase no sea reservada, y viceversa (`Choque de reserva`).

---

# 5. ARQUITECTURA Y MÓDULOS DEL BACKEND (NODE.JS / EXPRESS)

El servidor Express se configura en [app.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/app.js) y se inicializa mediante [server.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/server.js).

## 5.1 Configuración del Servidor y Variables de Entorno (`.env`)
Centralizada en [config/index.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/config/index.js):
```javascript
module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'clave_secreta_por_defecto',
  nodeEnv: process.env.NODE_ENV || 'development',
  emailNotificationsEnabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true'
};
```
Variables obligatorias en `.env`:
* `PORT`: Puerto TCP de escucha (predeterminado: 3000).
* `DATABASE_URL`: URI de conexión PostgreSQL (`postgresql://usuario:clave@localhost:5432/bd_turnos_aulas`).
* `JWT_SECRET`: Llave simétrica para firma y verificación HS256 de tokens de sesión.
* `EMAIL_NOTIFICATIONS_ENABLED`: Bandera booleana de control de envío de correos vía cron.

## 5.2 Capa de Middlewares de Seguridad y Control de Acceso

### 1. [authMiddleware.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/middlewares/authMiddleware.js)
* **`verifyToken`:** Extrae el token Bearer, verifica la firma criptográfica contra `jwtSecret`, consulta en `sesion_jwt` que `es_revocado = FALSE` y `fecha_expiracion > NOW()`, y evalúa estrictamente el estado del usuario:
  ```javascript
  const profile = rows[0];
  if (profile.id_estado_usr !== 1 || String(profile.nombre_estado || '').trim().toLowerCase() !== 'activo') {
    return res.status(403).json({ error: 'La cuenta de usuario está inactiva o suspendida' });
  }
  ```
* **`verifyRole(rolesPermitidos)`:** Restringe el acceso validando si `rolesPermitidos.includes(req.user.rol)`.
* **`protectWrites`:** Intercepta cualquier método `POST`, `PUT`, `PATCH` o `DELETE`. Exige token válido, comprueba rol administrativo (`ROLE_SUPER_ADMIN` o `ROLE_DIRECTOR_CARRERA`) y deriva a la validación de territorialidad.

### 2. [careerAuthorization.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/middlewares/careerAuthorization.js)
Implementa el blindaje territorial departamental:
* Si `req.user.rol === ROLE_SUPER_ADMIN`, se concede paso irrestricto.
* Si el usuario es Director de Carrera, comprueba mediante subconsultas SQL parametrizadas que el grupo, horario o plan afectado pertenezca a su Dirección (`id_direccion`). En caso de intentar modificar un recurso ajeno, arroja de inmediato un error HTTP `403 Forbidden` (`'Esta operación no pertenece a la Dirección del Director'`).
* Autoriza explícitamente operaciones operativas en infraestructura (`PUT /api/infraestructura/aulas/:id`) para que los directores puedan reportar fallas y gestionar el estado de mantenimiento.

## 5.3 Módulo de Autenticación y Control de Sesiones (`auth`)
* **Controlador:** [auth.controller.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/auth/auth.controller.js)
* **Servicio:** [auth.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/auth/auth.service.js)
* **Funciones Nucleares:**
  - `loginUser({ email, password, ip_acceso })`: Compara hash bcrypt, bloquea cuentas inactivas con HTTP 403, genera JTI UUIDv4 único, firma token JWT, persiste registro en `sesion_jwt` y audita el evento en `auditoria_acceso`.
  - `logoutUser(jti)`: Marca `es_revocado = TRUE` en la tabla `sesion_jwt`, invalidando la sesión de inmediato en el servidor.
  - `updateUserRole(id, { rol, id_direccion, id_estado_usr })`: Operación exclusiva de Super Administrador para promocionar roles, asociar Direcciones y suspender o reactivar cuentas.

## 5.4 Módulo de Infraestructura Física (`infraestructura`)
* **Controlador:** [aula.controller.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/infraestructura/aula.controller.js)
* **Servicio:** [aula.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/infraestructura/aula.service.js)
* **Funciones Nucleares:**
  - `getAll({ pabellon, piso })`: Consulta inventario de aulas con filtros jerárquicos y cálculo de plazas.
  - `createAula(data)` / `updateAula(id, data)`: Gestión de metadatos, capacidades y estados de espacio.
  - `deleteAula(id, inhabilitar)`: Si el aula posee historial de clases (`horario_clase`) o reservas (`reserva_temporal`), la función rechaza el borrado destructivo y la traslada automáticamente a estado `"En mantenimiento"` para preservar la integridad referencial.
  - `addRecurso(idAula, data)` / `removeRecurso(idAula, idRecAula)`: Instalación y retiro de equipos tecnológicos en aulas.
  - `getDisponibles({ dia, bloque, periodo })`: Retorna las aulas operativas desocupadas en una coordenada temporal específica.

## 5.5 Módulo Académico y Cargas Horarias (`academico`)
* **Controlador:** [academico.controller.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/academico/academico.controller.js)
* **Servicios:** [academico.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/academico/academico.service.js) y [curriculum.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/academico/curriculum.service.js)
* **Funciones Nucleares:**
  - `asignarDocente(idGrupo, idDocente)`: Vinculación de un profesor a un grupo en el periodo activo.
  - `desasignarDocente(idGrupo, idDocente)`: Retiro controlado de un profesor de un grupo.
  - `crearMateriaPlan({ id_plan, id_materia, nivel_semestral, cargas })`: Transacción atómica que asocia una materia a una malla curricular y configura de manera simultánea sus cuotas de carga horaria (`materia_carga_horaria`) en teoría, práctica y laboratorio.
  - `getDistributivoDocente(idPeriodo)`: Matriz unificada de grupos, materias ofertadas, cargas lectivas y docentes asignados.

## 5.6 Módulo de Planificación de Horarios y Reservas (`horarios`)
* **Controlador:** [horario.controller.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/horarios/horario.controller.js)
* **Servicio:** [horario.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/horarios/horario.service.js)
* **Funciones Nucleares:**
  - `validarHorasSemana(client, idGrupo, idTipoClase, idBloque, idHorario)`: Suma la duración en segundos de todas las sesiones planificadas para ese grupo y tipo de clase, sumando el nuevo bloque. Si el total supera `mch.horas_semana * 3600`, arroja un error HTTP `400 Bad Request` con código `'HORAS_EXCEDIDAS'`.
  - `validarChoqueReserva(client, idAula, idDia, idBloque, idGrupo)`: Validación bidireccional que comprueba si existe una `reserva_temporal` activa en esa aula, día y bloque dentro del periodo lectivo, abortando la inserción con error HTTP `409` (`'CHOQUE_RESERVA'`).
  - `crearHorarioClase(datos)` / `updateHorarioClase(id, datos)`: Inserción y actualización transaccional bajo `bloquear_calendario()`.
  - `getDisponibilidadAula(idAula, idPeriodo)`: Genera la matriz bidimensional Día × Bloque mediante `CROSS JOIN bloque_horario`, enlazando tanto clases oficiales como reservas temporales con indicación del estado real de ocupación: `'CLASE'`, `'RESERVA'` o `'DISPONIBLE'`.
  - `crearHorariosLote(items)` / `eliminarHorariosLote(items)`: Procesamiento atómico en masa de selecciones múltiples en grilla.

## 5.7 Módulo de Solicitudes y Workflow de Aprobación (`solicitudes`)
* **Controlador:** [solicitudes.controller.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/solicitudes/solicitudes.controller.js)
* **Servicio:** [solicitudes.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/solicitudes/solicitudes.service.js)
* **Funciones Nucleares:**
  - `crearSolicitud({ id_docente, id_horario, id_tipo_sol, aula_solicitada, justificacion })`: Registro de una solicitud formal de cambio de aula.
  - `resolverSolicitud({ id_solicitud, id_director, aprobado, id_motivo_rechazo })`:
    * Ejecuta `SELECT bloquear_calendario()` dentro de una transacción `BEGIN`.
    * Si la solicitud es aprobada (`aprobado = true`), valida la operatividad del aula de destino (`assertOperationalRoom`) y ejecuta inmediatamente:
      ```sql
      UPDATE horario_clase SET id_aula = $1 WHERE id_horario = $2 RETURNING *
      ```
    * Si el cambio provoca un choque con otra materia o reserva, los triggers nativos abortan la operación (`ROLLBACK`) y `parseConstraintError` retorna HTTP `409`.
    * Actualiza el estado de la solicitud a `'Aprobada'` o `'Rechazada'` y registra el evento en `historial_aprobacion`.

## 5.8 Módulo de Personas y Expedientes (`personas`)
* **Controlador:** [personas.controller.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/personas/personas.controller.js)
* **Servicio:** [personas.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/personas/personas.service.js)
* **Funciones Nucleares:**
  - `getAllEstudiantes({ idCarrera }, user)` / `getEstudianteById(id, user)`: Rutas protegidas exclusivamente para roles administrativos (`ROLE_SUPER_ADMIN` y `ROLE_DIRECTOR_CARRERA`). Para directores, se aplica `studentScope`, garantizando que únicamente se consulten estudiantes inscritos en carreras bajo su Dirección.
  - `getAllDocentes(user)` / `getDocenteById(id, user)`: Si quien consulta no es un administrador o director, el servicio oculta información sensible como `nro_documento`, `fecha_nacimiento` y `nacionalidad`, devolviendo solo el nombre docente y su tipo de contrato.

## 5.9 Capa de Utilidades Críticas y Manejo de Errores

### [pgErrorParser.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/utils/pgErrorParser.js)
Mapea los errores `P0001` de PostgreSQL a respuestas estructuradas:
* `/choque de aula/i` -> Código `CHOQUE_AULA` (HTTP 409).
* `/choque de docente/i` -> Código `CHOQUE_DOCENTE` (HTTP 409).
* `/choque.*reserva/i` -> Código `CHOQUE_RESERVA` (HTTP 409).
* `/cuota excedida|horas excedidas/i` -> Código `HORAS_EXCEDIDAS` (HTTP 400).

### [domainValidation.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/utils/domainValidation.js)
* `positiveId(value, name)`: Valida que los identificadores enteros sean números seguros positivos.
* `assertActiveUser(userOrState)`: Verifica que la cuenta se encuentre habilitada (`id_estado_usr === 1`).
* `assertOperationalRoom(client, idAula)`: Verifica con bloqueo de lectura concurrente (`FOR SHARE`) que el aula exista y no esté clasificada en mantenimiento o fuera de servicio.

---

# 6. ARQUITECTURA Y COMPONENTES DEL FRONTEND (REACT / VITE)

El frontend está desarrollado como una Single Page Application (SPA) con **React 18** empaquetada mediante **Vite**.

## 6.1 Configuración, Rutas y Ciclo de Vida
Definidas en [App.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/App.jsx) mediante `react-router-dom`:
* `/` -> Componente [Login.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Login/Login.jsx)
* `/portal` -> Vista institucional de consulta general ([Horarios.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Horarios/Horarios.jsx))
* `/mapa` -> Visualización esquemática por pabellón y piso ([MapaAulas.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Aulas/MapaAulas.jsx))
* `/academico` -> Gestión curricular y distributivo docente ([Academico.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Academico/Academico.jsx))
* `/asignacion` -> Distributivo y planificador interactivo de horarios ([Asignacion.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Asignacion/Asignacion.jsx))
* `/horarios` -> Consulta filtrable de horarios oficiales
* `/aulas` -> Inventario físico, recursos y mantenimiento ([AulasView.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Aulas/AulasView.jsx))
* `/configuracion` -> Administración RBAC y seguridad institucional ([ConfiguracionView.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Configuracion/ConfiguracionView.jsx))

## 6.2 Contexto de Autenticación y Autorización (`AuthContext.jsx`)
Ubicado en [context/AuthContext.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/context/AuthContext.jsx):
* Expone mediante el hook `useAuth()`:
  - `user`: Datos del perfil autenticado (`nombres`, `apellidos`, `email`, `rol`, `id_direccion`, `carreras_permitidas`).
  - `isSuperAdmin`: Booleano evaluado a partir de `rol === ROLE_SUPER_ADMIN`.
  - `isDirector`: Booleano evaluado a partir de `rol === ROLE_DIRECTOR_CARRERA`.
  - `canManage`: Capacidad de escritura general en el sistema.
  - `canManageGroup(idCarrera)`: Función de control territorial que autoriza si el grupo corresponde a las carreras adscritas a la Dirección del usuario.

## 6.3 Capa de Clientes HTTP y Servicios API
Centralizados en la carpeta `Frontend/src/services/`:
* [auth.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/services/auth.service.js): Manejo de JWT en almacenamiento local y llamadas de login/logout.
* [api.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/services/api.service.js): Endpoints generales de horarios, carreras, materias, grupos y períodos.
* [aulas.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/services/aulas.service.js): Endpoints de infraestructura física, pisos, pabellones, aulas, recursos y matriz de ocupación.
* [configuracion.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/services/configuracion.service.js): Modificación de contraseña, actualización de roles de usuario y asignación de Direcciones.

## 6.4 Módulo de Asignación y Planificador Interactivo (`Asignacion/`)
* [TabAsignacionMaterias.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Asignacion/TabAsignacionMaterias.jsx): Vista del Distributivo Académico. Permite vincular docentes a grupos y desasignar docentes mediante llamada a `DELETE /api/academico/asignaciones-docente/:id`.
* [TabPlanificacionHorarios.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Asignacion/TabPlanificacionHorarios.jsx): Núcleo de planificación asistida:
  - Selector en cascada de Docente, Materia/Grupo y Tipo de Sesión (Teoría/Laboratorio).
  - Consulta en tiempo real de la ocupación física (`aulasService.getAulasOcupacion`) y cruces del docente seleccionado.
  - Grilla interactiva de bloques donde las celdas se marcan en gris (ocupada por otra clase o reserva), naranja (docente ocupado en otra aula), o seleccionable.
  - Envío atómico mediante `apiService.crearHorariosLote`.
* [OcupacionDetalle.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Asignacion/OcupacionDetalle.jsx): Modal informativo emergente que detalla qué materia, docente y grupo ocupan un aula bloqueada.

## 6.5 Módulo de Aulas y Mantenimiento Físico (`Aulas/`)
* [AulasView.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Aulas/AulasView.jsx):
  - Barra de herramientas con filtrado en tiempo real por Pabellón, Piso y buscador de código.
  - Métricas institucionales (`AulasStatsGrid`): Total aulas, capacidad promedio, operativas y en mantenimiento.
  - **Función `reportFailure(aula)`:** Lógica bidireccional de mantenimiento:
    1. Si el aula está Disponible, solicita motivo de la falla y actualiza en base de datos a `"En mantenimiento"` (`PUT /api/infraestructura/aulas/:id`).
    2. Si el aula ya está En mantenimiento, ofrece dar el alta y restaurarla a `"Disponible"`.
  - **Función `handleDeleteAula(aula)`:** Si el aula tiene historial de clases o reservas, la inhabilita de forma segura; si no tiene registros, ejecuta la eliminación física.
* [AulaCard.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Aulas/AulaCard.jsx): Tarjeta individual de aula con indicadores de capacidad, badges de estado (`operativa` verde o `mantenimiento` ámbar), lista de recursos instalados y acciones rápidas (Ver horario, Recursos, Editar, Eliminar y Llave de mantenimiento).
* [AulaModal.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Aulas/AulaModal.jsx), [PabellonModal.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Aulas/PabellonModal.jsx) y [RecursosModal.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Aulas/RecursosModal.jsx): Modales de gestión CRUD de infraestructura física.

## 6.6 Módulo de Horarios y Portal Institucional (`Horarios/`)
* [Horarios.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Horarios/Horarios.jsx): Vista de consulta general con filtros de Carrera, Docente y Aula.
* [GridSemanal.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Horarios/GridSemanal.jsx): Matriz visual que renderiza los días de la semana y bloques horarios, calculando la posición de las tarjetas en función de su hora de inicio y fin. Utiliza [horarioSlots.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/utils/horarioSlots.js) para agrupar bloques continuos de una misma sesión en un solo bloque visual.

## 6.7 Módulo de Gestión Curricular (`Academico/`)
* [Academico.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Academico/Academico.jsx): Administración de Mallas Curriculares, Planes de Estudio y Materias.
* [PlanCurricularModal.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Academico/PlanCurricularModal.jsx): Formulario de configuración de materias adscritas a un plan, permitiendo asociar materias existentes y definir en tiempo real sus cargas horarias semanales de teoría, práctica y laboratorio.

## 6.8 Módulo de Administración y Seguridad (`Configuracion/`)
* [ConfiguracionView.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Configuracion/ConfiguracionView.jsx): Panel de administración general estructurado en pestañas:
  1. *Usuarios y Roles (RBAC):* Listado de cuentas, asignación de roles y vinculación con Direcciones Académicas ([TabUsuariosRBAC.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Configuracion/TabUsuariosRBAC.jsx) y [DireccionesPanel.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Configuracion/DireccionesPanel.jsx)).
  2. *Catálogos Institucionales:* Resumen de facultades, carreras y períodos lectivos ([TabCatalogos.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Configuracion/TabCatalogos.jsx)).
  3. *Mi Cuenta y Seguridad:* Actualización de contraseña propia y estado de sesión activa ([TabSeguridad.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Configuracion/TabSeguridad.jsx)).

## 6.9 Navegación Global y Barra Lateral (`Layout/ModuleSidebar.jsx`)
Ubicada en [ModuleSidebar.jsx](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/components/Layout/ModuleSidebar.jsx). Despliega los módulos funcionales del sistema en función del rol autenticado:
1. **Portal estudiantil:** Consulta pública institucional.
2. **Mapa:** Esquema visual de aulas por pabellón y piso.
3. **Académico:** Estructura de carreras y planes.
4. **Asignación:** Distributivo docente y planificador de horarios.
5. **Horarios:** Grilla general de clases.
6. **Aulas:** Catálogo y mantenimiento de infraestructura.
7. **Configuración:** Exclusivo para Super Administrador.
8. **Cerrar sesión:** Revocación de token JWT.

---

# 7. POLÍTICAS DE SEGURIDAD, CONTROL DE ACCESO Y PRIVACIDAD

## 7.1 Matriz de Control de Acceso Basado en Roles (RBAC)

| Módulo / Operación | Super Administrador | Director de Carrera | Visualizador Institucional |
| :--- | :---: | :---: | :---: |
| **Inicio de sesión (Login)** | ✅ Permitido | ✅ Permitido | ✅ Permitido |
| **Consulta de Horarios y Mapa** | ✅ Acceso Global | ✅ Acceso Global | ✅ Acceso Global |
| **Gestión de Cuentas y Roles RBAC** | ✅ Total | ❌ Denegado | ❌ Denegado |
| **Creación / Edición de Pabellones y Pisos** | ✅ Total | ❌ Denegado | ❌ Denegado |
| **Crear y Eliminar Aulas Físicas** | ✅ Total | ❌ Denegado | ❌ Denegado |
| **Reportar Falla / Poner Aula en Mantenimiento** | ✅ Total | ✅ Permitido | ❌ Denegado |
| **Gestión de Recursos en Aulas** | ✅ Total | ✅ Permitido | ❌ Denegado |
| **Planificación de Horarios (`horario_clase`)** | ✅ Todas las Carreras | ✅ Solo su Dirección | ❌ Solo Lectura |
| **Asignar / Desasignar Docentes** | ✅ Todas las Carreras | ✅ Solo su Dirección | ❌ Solo Lectura |
| **Resolver Solicitudes de Cambio de Aula** | ✅ Total | ✅ Solo su Dirección | ❌ Denegado |
| **Consulta de Expedientes de Estudiantes** | ✅ Total | ✅ Solo su Dirección | ❌ Denegado (HTTP 403) |
| **Consulta de Datos Sensibles Docentes** | ✅ Total | ✅ Total | ❌ Filtrado (Sin CI/Fecha) |

## 7.2 Territorialidad y Restricción por Dirección de Carrera
* La Universidad Mayor de San Francisco Xavier organiza sus carreras en Direcciones Departamentales (ej. Dirección TIC agrupa Ing. de Sistemas, Ing. en Tecnologías de la Información e Ing. de Telecomunicaciones).
* El usuario con rol `ROLE_DIRECTOR_CARRERA` posee un campo `id_direccion` obligatorio en la tabla `usuario`.
* El middleware `careerAuthorization` intercepta toda mutación y ejecuta consultas de verificación:
  ```sql
  SELECT pe.id_carrera 
  FROM grupo_materia gm 
  JOIN materia_plan mp USING(id_mat_plan) 
  JOIN plan_estudio pe USING(id_plan) 
  WHERE gm.id_grupo = $1
  ```
  Si la carrera del grupo no pertenece a `carreras_permitidas` de la Dirección del director autenticado, la transacción se aborta con HTTP 403.

## 7.3 Protección de Datos Personales Sensibles
En cumplimiento con estándares de privacidad y seguridad de la información:
* Las rutas de estudiantes (`/api/personas/estudiantes`, `/api/personas/estudiantes/:id`, `/api/personas/estudiantes/:id/inscripciones`) están blindadas con el middleware `privateRecords` (`ROLE_SUPER_ADMIN` y `ROLE_DIRECTOR_CARRERA`). Los visualizadores no pueden acceder a estos endpoints.
* En `personas.service.js`, las consultas `getAllDocentes` y `getDocenteById` evalúan dinámicamente el perfil del usuario. Si quien consulta no cuenta con rol administrativo, los campos `nro_documento`, `fecha_nacimiento`, `id_persona` y `nacionalidad` se omiten de la respuesta SQL.

## 7.4 Bloqueo Estricto de Usuarios Inactivos y Suspendidos
* Durante el login ([auth.service.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/modules/auth/auth.service.js)): Si `user.id_estado_usr !== 1` o el nombre del estado no es `'activo'`, el intento de autenticación se rechaza con código HTTP `403 Forbidden` (`"La cuenta de usuario está inactiva o suspendida"`).
* En cada petición subsiguiente ([authMiddleware.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/middlewares/authMiddleware.js)): Al decodificar el token JWT, `verifyToken` consulta en base de datos el registro vigente del usuario; si la cuenta fue dada de baja con posterioridad a la emisión del token, la petición es abortada de inmediato con HTTP 403.

---

# 8. CATÁLOGO DE ENDPOINTS DE LA API REST

A continuación se detalla la especificación de los principales endpoints expuestos por el Backend en `/api`:

### 8.1 Módulo Autenticación (`/api/auth`)
* `POST /api/auth/login`: Autentica credenciales y genera sesión JWT. Body: `{ email, password }`. Retorna: `{ token, user }`.
* `POST /api/auth/logout`: Revoca el token JWT de la sesión activa en base de datos. Requiere `Bearer Token`.
* `GET /api/auth/users`: Listado de cuentas registradas con sus roles y Direcciones. *(Super Admin)*.
* `PUT /api/auth/users/:id/role`: Actualiza rol, Dirección asignada y estado activo/inactivo del usuario. *(Super Admin)*.

### 8.2 Módulo Infraestructura (`/api/infraestructura`)
* `GET /api/infraestructura/pabellones`: Listado de pabellones del campus.
* `POST /api/infraestructura/pabellones`: Crea un nuevo pabellón físico. *(Super Admin)*.
* `GET /api/infraestructura/pabellones/:idPabellon/pisos`: Listado de pisos de un pabellón.
* `POST /api/infraestructura/pisos`: Registra un nuevo nivel/piso en un pabellón. *(Super Admin)*.
* `GET /api/infraestructura/aulas`: Listado filtrable de aulas por pabellón y piso.
* `POST /api/infraestructura/aulas`: Crea una nueva aula física. *(Super Admin)*.
* `PUT /api/infraestructura/aulas/:id`: Actualiza metadatos o estado de mantenimiento de un aula. *(Super Admin y Director)*.
* `DELETE /api/infraestructura/aulas/:id`: Elimina un aula o la inhabilita a mantenimiento si tiene historial. *(Super Admin)*.
* `POST /api/infraestructura/aulas/:id/recursos`: Asocia equipamiento técnico a un aula. *(Super Admin y Director)*.
* `DELETE /api/infraestructura/aulas/:id/recursos/:idRecAula`: Retira un recurso de un aula. *(Super Admin y Director)*.
* `GET /api/infraestructura/aulas/disponibles`: Consulta aulas libres por día, bloque y periodo.

### 8.3 Módulo Horarios y Planificación (`/api/horarios`)
* `POST /api/horarios/clase`: Inserción individual de un bloque de clase con validación de choques. *(Super Admin y Director)*.
* `POST /api/horarios/clase/lote`: Inserción masiva atómica de bloques horarios seleccionados. *(Super Admin y Director)*.
* `PUT /api/horarios/clase/:id`: Modifica la ubicación o franja de una clase regular. *(Super Admin y Director)*.
* `DELETE /api/horarios/clase/:id`: Elimina un bloque de clase planificado. *(Super Admin y Director)*.
* `DELETE /api/horarios/clase/lote`: Eliminación atómica en lote de múltiples bloques horarios. *(Super Admin y Director)*.
* `GET /api/horarios/disponibilidad/:idAula/:idPeriodo`: Matriz completa de disponibilidad y reservas del aula.
* `POST /api/horarios/reserva`: Registra una reserva temporal institucional. *(Director)*.
* `DELETE /api/horarios/reserva/:id`: Cancela una reserva temporal activa. *(Director titular o Super Admin)*.

### 8.4 Módulo Académico (`/api/academico`)
* `GET /api/academico/distributivo`: Retorna la matriz de distributivo docente-materia-grupo del periodo activo.
* `POST /api/academico/asignar-docente`: Asigna un profesor a un grupo específico. *(Super Admin y Director)*.
* `DELETE /api/academico/asignaciones-docente/:id`: Desasigna a un profesor de un grupo. *(Super Admin y Director)*.
* `POST /api/academico/planes/materias-configuracion`: Asocia una materia a un plan y fija sus cargas horarias. *(Super Admin y Director)*.
* `GET /api/academico/carreras`: Catálogo de carreras adscritas con sus siglas y facultades.
* `GET /api/academico/periodo-activo`: Retorna la gestión y metadatos del periodo lectivo vigente.

### 8.5 Módulo Solicitudes (`/api/solicitudes`)
* `POST /api/solicitudes/cambio`: Envío de solicitud de cambio de aula por parte del docente.
* `GET /api/solicitudes/cambio/pendientes/:idDirector`: Bandeja de solicitudes de cambio pendientes de revisión.
* `POST /api/solicitudes/cambio/resolver`: Aprueba o rechaza una solicitud, aplicando el cambio de aula en `horario_clase` de forma transaccional si es aprobada. *(Director)*.

### 8.6 Módulo Personas (`/api/personas`)
* `GET /api/personas/docentes`: Directorio de profesores universitarios.
* `GET /api/personas/docentes/:id`: Expediente del docente (campos sensibles restringidos a roles administrativos).
* `POST /api/personas/docentes`: Registro de nuevo docente en la institución. *(Super Admin)*.
* `GET /api/personas/estudiantes`: Directorio de estudiantes matriculados (exclusivo para administración y directores).
* `GET /api/personas/estudiantes/:id/inscripciones`: Materias y grupos cursados por un estudiante en el periodo activo.

---

# 9. GUÍA DE DESPLIEGUE, PUESTA EN MARCHA Y VERIFICACIÓN

### 9.1 Requisitos del Entorno
* **Node.js:** Versión 18.x o 20.x LTS instalada.
* **PostgreSQL:** Versión 14 o superior.
* **NPM:** Gestor de paquetes v9 o superior.

### 9.2 Configuración y Migración de Base de Datos
1. Crear la base de datos institucional en PostgreSQL:
   ```sql
   CREATE DATABASE bd_turnos_aulas WITH ENCODING 'UTF8';
   ```
2. Ejecutar el esquema base y las migraciones de integridad en orden estricto:
   ```bash
   psql -U postgres -d bd_turnos_aulas -f "schema_bd_turnos_aulas (1).sql"
   psql -U postgres -d bd_turnos_aulas -f "Backend/migrations/001_bloques_30min.sql"
   psql -U postgres -d bd_turnos_aulas -f "Backend/migrations/002_cargas_horarias.sql"
   psql -U postgres -d bd_turnos_aulas -f "Backend/migrations/003_direcciones_carrera.sql"
   psql -U postgres -d bd_turnos_aulas -f "Backend/migrations/004_cuota_estricta.sql"
   psql -U postgres -d bd_turnos_aulas -f "Backend/migrations/005_integridad_concurrente.sql"
   ```
3. Inicializar los datos del periodo y cuentas demo:
   ```bash
   cd Backend
   node seed_completo.js
   node seed_horarios_institucion.js
   ```

### 9.3 Puesta en Marcha del Backend
1. Instalar dependencias del servidor:
   ```bash
   cd Backend
   npm install
   ```
2. Configurar el archivo `.env`:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://postgres:tu_contraseña@localhost:5432/bd_turnos_aulas
   JWT_SECRET=super_clave_secreta_universidad_usfx_2026
   NODE_ENV=production
   EMAIL_NOTIFICATIONS_ENABLED=false
   ```
3. Iniciar el servidor:
   ```bash
   npm start
   ```
   *Salida esperada:*
   ```
   Servidor corriendo en el puerto 3000
   ```

### 9.4 Puesta en Marcha y Compilación del Frontend
1. Instalar dependencias del cliente:
   ```bash
   cd Frontend
   npm install
   ```
2. Ejecución en entorno de desarrollo:
   ```bash
   npm run dev
   ```
   *Acceso por navegador:* `http://localhost:5173`
3. Empaquetado optimizado para producción:
   ```bash
   npm run build
   ```
   Los archivos estáticos optimizados se generarán en la carpeta `Frontend/dist/`, listos para ser servidos por Nginx, Apache o cualquier CDN institucional.

### 9.5 Verificación de Salud del Sistema
* **Endpoint de Healthcheck:** Consultar en navegador o Postman:
  `GET http://localhost:3000/api/health`
  *Respuesta:* `{"status":"OK","timestamp":"2026-11-05T..."}`

---

# 10. GUÍA DE MANTENIMIENTO, EXTENSIBILIDAD Y BUENAS PRÁCTICAS

1. **Inviolabilidad de Transacciones en Horarios:** Todo endpoint o servicio que inserte o modifique horarios de clase (`horario_clase`) o reservas debe mantener obligatoriamente la llamada `SELECT bloquear_calendario()` al abrir la transacción `BEGIN`. Nunca debe omitirse este cerrojo consultivo.
2. **Preservación de Trazabilidad Histórica:** Nunca debe ejecutarse una sentencia destructiva `DELETE FROM aula` si el aula tiene asignaciones académicas pasadas. En su lugar, el sistema debe utilizar siempre la inhabilitación funcional actualizando `id_estado_espacio = 2` ('En mantenimiento').
3. **Manejo Semántico de Errores PostgreSQL:** Al agregar nuevas restricciones nativas en base de datos mediante `RAISE EXCEPTION`, debe registrarse el patrón de expresión regular correspondiente en [pgErrorParser.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Backend/src/utils/pgErrorParser.js) para garantizar que la API siempre devuelva un código HTTP semántico (`409 Conflict`, `400 Bad Request`) en lugar de errores genéricos `500 Internal Server Error`.
4. **Conservación de Docstrings y Tipado de Interfaces:** Toda modificación a componentes de la grilla horaria o modelos modales debe conservar la normalización horaria en múltiplos exactos de 30 minutos utilizando las funciones provistas en [horarioSlots.js](file:///d:/8vo%20Semestre/SHC131%20Taller%20de%20Especialidad/Proyecto_Aulas/Frontend/src/utils/horarioSlots.js).

---
*Manual generado para fines académicos y de titulación en la Universidad Mayor, Real y Pontificia de San Francisco Xavier de Chuquisaca.*

