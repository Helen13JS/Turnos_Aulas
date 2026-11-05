# Sistema de Gestión de Turnos, Recursos y Asignación de Aulas

## Descripción

Backend en **Node.js + Express** que expone una API REST JSON y se conecta a una base de datos PostgreSQL existente (66 tablas en 3FN) usando el driver nativo **pg**. No se utilizan ORMs ni migraciones; el esquema ya está creado.

## Requisitos

- Node.js 20+ (compatible con el proyecto)
- PostgreSQL 15+ con el esquema `schema_bd_turnos_aulas.sql` cargado
- Un cliente de correo SMTP para las notificaciones (opcional, se configura vía variables de entorno)

## Instalación

```bash
# Clonar el repositorio (o copiar los archivos a tu carpeta de proyecto)
# ...

# Instalar dependencias
npm install

# Copiar el archivo de ejemplo de variables de entorno y editarlo
cp .env.example .env
# Edita .env con tus credenciales y configuración
```

### Variables de entorno (`.env`)

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto donde escuchará la API (por defecto `3000`). |
| `DATABASE_URL` | Cadena de conexión a PostgreSQL, por ejemplo `postgresql://user:password@localhost:5432/turnos_aulas`. |
| `JWT_SECRET` | Secreto usado para firmar los tokens JWT. |
| `SMTP_HOST` | Host del servidor SMTP para enviar correos. |
| `SMTP_PORT` | Puerto del servidor SMTP (usualmente `587`). |
| `SMTP_USER` | Usuario SMTP. |
| `SMTP_PASS` | Contraseña SMTP. |

## Ejecutar la aplicación

```bash
# modo desarrollo (con nodemon)
npm run dev

# modo producción
npm start
```

La API se expone bajo el prefijo `/api`. Por ejemplo, para comprobar que el servidor está activo:

```bash
curl http://localhost:${PORT}/api/health
# => {"status":"ok"}
```

## Próximas fases

- Seguridad y autenticación (JWT + RBAC)
- Implementación de catálogos académicos y de infraestructura
- Endpoints para horarios y reservas con manejo de los triggers (`P0001` → HTTP 409)
- Automatización con `node-cron` y envío de correos con `nodemailer`

---

*Este proyecto sigue una arquitectura de tres capas: **routes → controllers → services → persistencia**.*
