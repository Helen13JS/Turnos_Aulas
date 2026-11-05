# RBAC de tres niveles

El alcance vigente es por Dirección/Departamento. Ver [DIRECCIONES.md](DIRECCIONES.md) para el modelo, la agrupación TIC/INF/ELE y los endpoints de oferta. En una base ya migrada a tres roles aplicar solo la migración 004; no repetir la 003 posteriormente.

Ejecutar `migrations/003_roles_tres_niveles.sql` y luego `migrations/004_direcciones_academicas.sql` antes de iniciar esta versión. La migración es transaccional e idempotente: conserva roles canónicos existentes; convierte administradores históricos en `ROLE_SUPER_ADMIN`, directores en `ROLE_DIRECTOR_CARRERA` y el resto en `ROLE_VISUALIZADOR`. Detiene la migración si un Director no tiene una carrera inequívoca o no existe Administrador General.

`usuario.rol` es la fuente de autorización; `usuario.id_direccion` es obligatorio exclusivamente para Director. Las restricciones CHECK y la FK impiden combinaciones inválidas. Las tablas históricas de permisos no conceden privilegios.

| Capacidad | Super Admin | Director | Visualizador |
| --- | --- | --- | --- |
| Consultar horarios, portal y mapa | Sí | Sí | Sí |
| Crear grupos y asignar docentes | Todas las carreras | Todas las carreras de su Direccion | No |
| Crear, modificar y eliminar horarios | Todas las carreras | Todas las carreras de su Direccion | No |
| Reservas y solicitudes de cambio | Todas | Todas las carreras de su Direccion e identidad | No |
| Infraestructura y recursos | Sí | No | No |
| Catálogos, personas y períodos | Sí | No | No |
| Crear usuarios y cambiar roles | Sí | No | No |

Cada petición verifica firma HS256, expiración, sesión vinculada al usuario, revocación y perfil vigente en PostgreSQL. El JWT contiene `rol` e `id_direccion`, pero el perfil de base de datos prevalece incluso si el token conserva un rol anterior. `verifyRole([...])` deniega roles no permitidos. `protectWrites` cubre POST, PUT, PATCH y DELETE en los routers de negocio, y `authorizeCareerWrites` deniega por defecto acciones de Director no enumeradas explícitamente. Comprueba el registro persistido y el grupo de destino al modificar horarios, evitando cambios entre Direcciones. No se deshabilitan triggers de integridad.

Los GET de negocio requieren autenticación y permiten consulta global a todos los roles. El listado administrativo de usuarios es exclusivo de Super Admin. Login y health son públicos; logout y cambio de contraseña propia son operaciones de cuenta permitidas a cualquier usuario autenticado.

Administración: `POST /api/auth/register` acepta datos de persona, email, contraseña de al menos ocho caracteres, `rol` e `id_direccion` para Director; `PUT /api/auth/usuarios/:id/rol` recibe `{rol,id_direccion}`. Ambos requieren Super Admin. No se permite degradar al último Super Admin. Crear/asignar un Director garantiza su registro en `director_carrera` y conserva relaciones históricas.

React obtiene el perfil desde `/api/auth/me` antes de mostrar vistas protegidas. `useAuth` expone rol, `isSuperAdmin`, `isDirector`, `isViewer`, `canManageInfrastructure` y `canManageGroup`. Los controles de planificación y borrado se evalúan por carrera para cada grupo/tarjeta. `/configuracion` permite crear cuentas y cambiar roles únicamente como Super Admin. Portal y mapa son de consulta; el mapa refresca cada 15 segundos y al recuperar foco, con verde libre, rojo ocupado y amarillo fuera de servicio.

## Validación local

`node artifacts/rbac-direcciones/run.cjs --api-only` ejecuta pruebas HTTP y PostgreSQL con la aplicación actual en puerto 3002. Sin la opción también recorre las interfaces de los servidores locales en 3000/5173 mediante Playwright/Chromium instalado en este entorno.

Comprueba los tres roles mediante login real, 27 rutas de escritura para Visualizador, acceso global restringido, creación/actualización/borrado propios, rechazo de carreras ajenas y destinos cruzados, claims falsificados, cambios de rol sin renovar JWT y restricciones de PostgreSQL. La prueba de navegador comprueba controles por rol/carrera, alta de Director y cambio de rol, portal y mapa. Elimina cuentas, grupos y horarios temporales y verifica que el número original de horarios se conserve. Resultados y capturas: `artifacts/rbac-direcciones/`.

Los guiones de pruebas históricos de dos roles documentan versiones anteriores y no validan este contrato.

La autorización protege los endpoints existentes. El CRUD general de edificios/aulas, previamente incompleto, no se implementa con esta migración; su botón de alta continúa deshabilitado. La gestión existente de recursos sí funciona y es exclusiva de Super Admin.
