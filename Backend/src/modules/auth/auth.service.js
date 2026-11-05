// src/modules/auth/auth.service.js
const db = require('../../config/db');
const { assertActiveUser } = require('../../utils/domainValidation');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../../config');
const { ALL_ROLES, ROLE_VISUALIZADOR, ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA, canManage } = require('../../utils/roles');

function roleAssignment(rol, idDireccion) {
  if (!ALL_ROLES.includes(rol) || (rol === ROLE_DIRECTOR_CARRERA && (!Number.isSafeInteger(Number(idDireccion)) || Number(idDireccion) <= 0)) ||
      (rol !== ROLE_DIRECTOR_CARRERA && idDireccion != null && idDireccion !== '')) {
    const error = new Error('Indica uno de los tres roles y una Dirección válida para el Director'); error.status = 400; throw error;
  }
  return { rol, id_direccion: rol === ROLE_DIRECTOR_CARRERA ? Number(idDireccion) : null };
}

async function ensureDirector(client, idPersona, idDireccion) {
  await client.query(`INSERT INTO director_carrera (id_persona,id_direccion,fecha_posesion)
    SELECT $1,$2,CURRENT_DATE WHERE NOT EXISTS (SELECT 1 FROM director_carrera WHERE id_persona=$1 AND id_direccion=$2)`, [idPersona,idDireccion]);
}

/**
 * Registra un nuevo usuario.
 * Primero inserta en persona, luego en usuario.
 * Campos esperados: { nombres, apellidos, nro_documento, id_tipo_doc,
 *   id_nacionalidad, email, password, id_estado_usr }
 */
async function registerUser({
  nombres, apellidos, nro_documento, id_tipo_doc,
  id_nacionalidad, email, password, id_estado_usr,
  fecha_nacimiento, rol = ROLE_VISUALIZADOR, id_direccion
}) {
  const assignment = roleAssignment(rol, id_direccion);
  if (![nombres, apellidos, nro_documento, email, password].every((s) => typeof s === 'string' && s.trim()) || password.length < 8) {
    const error = new Error('Completa los datos personales y usa una contraseña de al menos 8 caracteres'); error.status = 400; throw error;
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Insertar persona
    const personaQ = `
      INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos, fecha_nacimiento)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_persona
    `;
    const { rows: pRows } = await client.query(personaQ, [
      id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos, fecha_nacimiento || null
    ]);
    const id_persona = pRows[0].id_persona;

    // 2. Insertar usuario
    const passwordHash = await bcrypt.hash(password, 10);
    const usuarioQ = `
      INSERT INTO usuario (id_persona, id_estado_usr, email, password_hash, rol, id_direccion)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_usuario, email, fecha_creacion, rol, id_direccion
    `;
    const { rows: uRows } = await client.query(usuarioQ, [
      id_persona, id_estado_usr || 1, email, passwordHash, assignment.rol, assignment.id_direccion
    ]);

    if (assignment.rol === ROLE_DIRECTOR_CARRERA) await ensureDirector(client, id_persona, assignment.id_direccion);

    await client.query('COMMIT');
    return { ...uRows[0], nombres, apellidos };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Autentica un usuario y devuelve un JWT.
 * Registra la sesión en sesion_jwt y la auditoría en auditoria_acceso.
 */
async function loginUser({ email, password, ip_acceso }) {
  // 1. Buscar usuario + datos de persona
  const query = `
    SELECT u.id_usuario, u.email, u.password_hash, u.id_estado_usr, u.rol, u.id_direccion,
           p.nombres, p.apellidos, eu.nombre_estado
    FROM usuario u
    JOIN persona p ON u.id_persona = p.id_persona
    JOIN estado_usuario eu ON eu.id_estado_usr=u.id_estado_usr
    WHERE u.email = $1
  `;
  const { rows } = await db.query(query, [email]);
  if (rows.length === 0) {
    throw new Error('Credenciales inválidas');
  }
  const user = rows[0];

  // 2. Validar password
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Credenciales inválidas');
  }

  // Validar estado de la cuenta (bloqueo de usuarios inactivos / suspendidos)
  if (user.id_estado_usr !== 1 || String(user.nombre_estado || '').trim().toLowerCase() !== 'activo') {
    const error = new Error('La cuenta de usuario está inactiva o suspendida');
    error.status = error.statusCode = 403;
    throw error;
  }
  assertActiveUser(user);

  // 3. Obtener roles del usuario
  const roles = [{ nombre_rol: user.rol }];

  // 4. Generar JWT
  const jti = uuidv4();
  const expiresIn = '8h';
  const payload = {
    userId: user.id_usuario,
    rol: user.rol,
    id_direccion: user.id_direccion,
    nombres: user.nombres,
    jti
  };
  const token = jwt.sign(payload, config.jwtSecret, { expiresIn });

  // 5. Registrar sesión JWT
  const expDate = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8h
  await db.query(
    `INSERT INTO sesion_jwt (id_usuario, token_jti, fecha_expiracion) VALUES ($1, $2, $3)`,
    [user.id_usuario, jti, expDate]
  );

  // 6. Auditoría de acceso
  await db.query(
    `INSERT INTO auditoria_acceso (id_usuario, ip_acceso, accion) VALUES ($1, $2, $3)`,
    [user.id_usuario, ip_acceso || null, 'LOGIN']
  );

  return {
    token,
    user: {
      id_usuario: user.id_usuario,
      nombres: user.nombres,
      apellidos: user.apellidos,
      email: user.email,
      roles, rol: user.rol, id_direccion: user.id_direccion, can_manage: canManage(user.rol)
    }
  };
}

/**
 * Revoca un JWT por su JTI.
 */
async function logoutUser(jti) {
  await db.query(
    `UPDATE sesion_jwt SET es_revocado = TRUE WHERE token_jti = $1`,
    [jti]
  );
}

/**
 * Verifica que el JTI no haya sido revocado.
 */
async function isTokenRevoked(jti) {
  const { rows } = await db.query(
    `SELECT es_revocado FROM sesion_jwt WHERE token_jti = $1`,
    [jti]
  );
  if (rows.length === 0) return true; // no existe → revocado
  return rows[0].es_revocado;
}

async function getUsers() {
  const query = `
    SELECT u.id_usuario, u.email, u.fecha_creacion, u.rol, u.id_direccion,
           p.nombres, p.apellidos, eu.nombre_estado, dc.nombre_direccion, ARRAY[u.rol] AS roles
    FROM usuario u
    JOIN persona p ON u.id_persona = p.id_persona
    JOIN estado_usuario eu ON u.id_estado_usr = eu.id_estado_usr
    LEFT JOIN direccion_academica dc ON dc.id_direccion=u.id_direccion
    ORDER BY p.apellidos, p.nombres
  `;
  const { rows } = await db.query(query);
  return rows;
}

async function updateUserRole(idUsuario, body) {
  const assignment = roleAssignment(body.rol, body.id_direccion);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE usuario IN SHARE ROW EXCLUSIVE MODE');
    const { rows } = await client.query('SELECT id_persona,rol FROM usuario WHERE id_usuario=$1', [idUsuario]);
    if (!rows.length) { await client.query('ROLLBACK'); return null; }
    if (rows[0].rol === ROLE_SUPER_ADMIN && assignment.rol !== ROLE_SUPER_ADMIN &&
        (await client.query('SELECT COUNT(*)::int AS n FROM usuario WHERE rol=$1', [ROLE_SUPER_ADMIN])).rows[0].n <= 1) {
      const error = new Error('No se puede quitar el último Administrador General'); error.status = 409; throw error;
    }
    const result = await client.query('UPDATE usuario SET rol=$1,id_direccion=$2 WHERE id_usuario=$3 RETURNING id_usuario,rol,id_direccion', [assignment.rol,assignment.id_direccion,idUsuario]);
    if (assignment.rol === ROLE_DIRECTOR_CARRERA) await ensureDirector(client, rows[0].id_persona, assignment.id_direccion);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}

async function updatePassword(idUsuario, { currentPassword, newPassword, confirmPassword }) {
  if (!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 8) {
    const error = new Error('Verifica la contraseña actual, la confirmación y usa al menos 8 caracteres');
    error.code = 'INVALID_PASSWORD';
    throw error;
  }
  const { rows } = await db.query('SELECT password_hash FROM usuario WHERE id_usuario = $1', [idUsuario]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    const error = new Error('La contraseña actual no es válida');
    error.code = 'INVALID_PASSWORD';
    throw error;
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE usuario SET password_hash = $1 WHERE id_usuario = $2', [hash, idUsuario]);
}

module.exports = { registerUser, loginUser, logoutUser, isTokenRevoked, getUsers, updatePassword, updateUserRole };
