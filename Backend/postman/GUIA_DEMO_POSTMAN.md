# Demo Postman - Sistema Aulas

## 1) Antes de iniciar

1. Levantar backend:
   - `cd Backend`
   - `npm run dev`
2. Verificar que el servidor corre en `http://localhost:3000`.
3. En Postman importar:
   - `Sistema_Aulas_Demo.postman_collection.json`
   - `Sistema_Aulas_Local.postman_environment.json`
4. Seleccionar environment: `Sistema Aulas - Local`.

## 2) Guion rapido (5 minutos)

### Minuto 1 - Disponibilidad API

1. Ejecutar `00 - Salud / Health Check`.
2. Explicar: "Primero validamos que la API esta operativa".

### Minuto 2 - Login y token

1. Ejecutar `01 - Auth / Login OK` con credenciales reales.
2. Explicar:
   - "El backend valida credenciales".
   - "Devuelve JWT y datos de usuario".
   - "Postman guarda el token automaticamente en la variable `token`".

### Minuto 3 - Datos del panel

1. Ejecutar `02 - Panel (Protegido) / Docentes`.
2. Ejecutar `02 - Panel (Protegido) / Horarios de Docente`.
3. Ejecutar `02 - Panel (Protegido) / Aulas`.
4. Ejecutar `02 - Panel (Protegido) / Disponibilidad Aula x Periodo`.
5. Explicar: "Estos endpoints alimentan la vista del panel: busqueda de docentes, horario global y disponibilidad".

### Minuto 4 - Seguridad

1. Ejecutar `03 - Seguridad / Sin Token (401)`.
2. Explicar: "Sin JWT no se puede consultar recursos protegidos".
3. Ejecutar `01 - Auth / Login Invalido (401)`.
4. Explicar: "Credenciales incorrectas son rechazadas".

### Minuto 5 - Cierre de sesion

1. Ejecutar `01 - Auth / Logout`.
2. Repetir `02 - Panel (Protegido) / Docentes`.
3. Explicar: "El token se revoca y el acceso se bloquea".

## 3) Script sugerido para explicar Login y Panel

"El flujo inicia en login. El usuario envia email y password a `/api/auth/login`.\
Si las credenciales son validas, el backend devuelve un JWT con roles y datos del usuario.\
Ese token se envia en `Authorization: Bearer <token>` para consumir los endpoints protegidos.\
El panel muestra una bienvenida con el nombre del usuario y consulta docentes, horarios y disponibilidad de aulas.\
Al cerrar sesion, el token se revoca y se redirige al login." 

## 4) Tips para que no falle la demo

1. Tener listas credenciales reales en `Login OK`.
2. Si algun ID no existe, ajustar variables `idDocente`, `idAula`, `idPeriodo` en el environment.
3. Si sale `Token invalido o expirado`, ejecutar de nuevo `Login OK`.
4. Mostrar siempre primero `Health Check` para confirmar que el backend esta vivo.
