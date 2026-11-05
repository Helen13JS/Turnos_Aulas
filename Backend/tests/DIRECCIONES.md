# Direcciones académicas y autorización

Aplicar las migraciones en orden: 001, 002, 003 y 004. Para una instalación ya migrada a tres roles, ejecutar únicamente `migrations/004_direcciones_academicas.sql`. La 004 es transaccional e idempotente. No volver a ejecutar la 003 después de la 004: corresponde al modelo histórico por carrera.

## Modelo vigente

- `direccion_academica(id_direccion, codigo UNIQUE, nombre_direccion)` agrupa carreras sin cambiar su facultad.
- `direccion_carrera.id_direccion` es FK obligatoria. La tabla preexistente `direccion_carrera` sigue representando las **carreras**, no los departamentos.
- `usuario.id_direccion` es FK obligatoria solo para `ROLE_DIRECTOR_CARRERA`; los otros roles no llevan Dirección. `usuario.id_carrera` queda NULL como compatibilidad y no autoriza operaciones.
- `director_carrera.id_direccion` identifica la Dirección de la persona y conserva los IDs históricos que referencian reservas y aprobaciones. Su antigua `id_carrera` se conserva para registros históricos; los nuevos directores se crean sin carrera individual.

Agrupación inicial solicitada:

| Dirección | Carreras existentes |
| --- | --- |
| TIC | Sistemas (5), Ingeniería de Sistemas (10 y 20) |
| INF | Licenciatura en Informática (22) |
| ELE | Ingeniería Electrónica (21) |

Ingeniería de Software no existe en la base actual. Al registrar una carrera nueva se debe seleccionar su Dirección, por ejemplo TIC. El Administrador General puede crear otras agrupaciones como 6X sin tocar la autorización.

## API y UI

- `GET /api/academico/direcciones`: catálogo de direcciones con todas sus carreras, autenticado.
- `POST /api/academico/direcciones`: `{codigo,nombre_direccion}`, solo Super Admin.
- `PUT /api/academico/direcciones/:id/carreras/:idCarrera`: cambia la pertenencia, solo Super Admin.
- `GET /api/academico/direcciones/:id/oferta?periodo=4`: grupos de **todas** las carreras de esa Dirección. Director solo puede consultar su Dirección mediante este endpoint. Sin período usa el activo determinista. Las vistas globales de horarios/mapa continúan disponibles como lectura para entender cruces de recursos compartidos.
- Registro de usuarios y cambio de rol reciben `id_direccion` en lugar de `id_carrera`. `/auth/me` expone `id_direccion`, `id_director` y `carreras_permitidas`, derivadas en cada petición desde PostgreSQL. El JWT incluye la Dirección y el rol; el perfil vigente en base de datos prevalece sobre claims antiguos.
- `authorizeCareerWrites` resuelve la carrera del grupo/horario y verifica su pertenencia a la Dirección actual. En PUT verifica origen y destino. Reservas, aprobación de cambios y excepciones utilizan el mismo alcance departamental. Los GET de directores, reservas y solicitudes pendientes también contemplan el departamento completo.
- `useAuth.canManageGroup` compara la carrera de cada grupo/tarjeta con `carreras_permitidas`. Configuración permite crear Direcciones, vincular carreras y asignar usuarios a una Dirección. Al cambiar la agrupación, las nuevas peticiones quedan sujetas al alcance actualizado; recargar la página actualiza los controles React.

## Integridad global

La migración no altera, deshabilita ni filtra por Dirección los triggers de aulas, docentes o reservas. `fn_validar_choque_aula` sigue comparando aula/día/bloque/período contra todos los grupos, incluidos los de otras Direcciones o facultades. La autorización departamental no convierte un aula común en un recurso privado del departamento.

`node artifacts/rbac-direcciones/run.cjs --api-only` valida permisos en HTTP y PostgreSQL. Sin esa opción también ejecuta Playwright contra los servidores locales. Incluye escritura en dos carreras de TIC, rechazo de Informática/Electrónica, consulta de oferta completa, choque de aula entre Direcciones tanto por API (409) como con INSERT SQL directo, restricciones del modelo y lectura del perfil vigente. Elimina sus datos temporales y comprueba que los horarios originales se conserven. Resultados en `artifacts/rbac-direcciones/result.json`.
