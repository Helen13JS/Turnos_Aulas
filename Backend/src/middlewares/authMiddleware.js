// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { assertActiveUser } = require('../utils/domainValidation');
const config = require('../config');
const db = require('../config/db');
const { canManage, ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA } = require('../utils/roles');
const { authorizeCareerWrites } = require('./careerAuthorization');

/**
 * Verifica que la petición incluya un JWT válido y no revocado.
 * Añade el payload decodificado a req.user.
 */
async function verifyToken(req, res, next) {
  if (req.authVerified) return next();
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

    // Vincula la sesión a su usuario y comprueba caducidad y roles actuales.
    const { rows } = await db.query(`
      SELECT eu.nombre_estado, u.id_estado_usr, u.id_usuario, u.email, u.rol, u.id_direccion, p.nombres, p.apellidos,
             COALESCE((SELECT json_agg(c.id_carrera ORDER BY c.id_carrera) FROM direccion_carrera c WHERE c.id_direccion=u.id_direccion), '[]'::json) AS carreras_permitidas,
             (SELECT MIN(d.id_director) FROM director_carrera d WHERE d.id_persona=u.id_persona AND d.id_direccion=u.id_direccion) AS id_director,
             json_build_array(json_build_object('nombre_rol',u.rol)) AS roles
      FROM sesion_jwt s JOIN usuario u ON u.id_usuario = s.id_usuario
      JOIN persona p ON p.id_persona = u.id_persona
      JOIN estado_usuario eu ON eu.id_estado_usr=u.id_estado_usr
      WHERE s.token_jti = $1 AND s.id_usuario = $2
        AND s.es_revocado = FALSE AND s.fecha_expiracion > NOW()
    `, [payload.jti, payload.userId]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Token revocado o inválido' });
    }

    const profile = rows[0];
    if (profile.id_estado_usr !== 1 || String(profile.nombre_estado || '').trim().toLowerCase() !== 'activo') {
      return res.status(403).json({ error: 'La cuenta de usuario está inactiva o suspendida' });
    }
    assertActiveUser(profile);
    req.user = { ...payload, ...profile, userId: profile.id_usuario, can_manage: canManage(profile.rol) };
    req.authVerified = true;
    next();
  } catch (err) {
    if (err.statusCode === 403) return res.status(403).json({ error: err.message });
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Autoriza los roles canónicos del perfil vigente de PostgreSQL.
 */
function verifyRole(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Usuario no autenticado' });
    if (!rolesPermitidos.includes(req.user.rol)) return res.status(403).json({ error: 'Rol sin permiso para esta operacion' });
    next();
  };
}

// Compatibilidad con las rutas existentes; las autorizaciones territoriales se
// ejecutan antes, en protectWrites. Los permisos historicos no elevan privilegios.
function checkPermission() {
  return (req, res, next) => req.method === 'GET' ? next() : verifyRole([ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA])(req, res, next);
}
const requireAdministrator = verifyRole([ROLE_SUPER_ADMIN]);
function protectWrites(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  return verifyToken(req, res, () => verifyRole([ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA])(req, res, () => authorizeCareerWrites(req, res, next)));
}
module.exports = { verifyToken, verifyRole, checkPermission, requireAdministrator, protectWrites };
