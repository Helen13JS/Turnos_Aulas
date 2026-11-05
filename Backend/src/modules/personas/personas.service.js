const { PERIODO_ACTIVO_SQL } = require('../../utils/periodoActivo');
// src/modules/personas/personas.service.js
const db = require('../../config/db');
const { ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA } = require('../../utils/roles');
const { httpError } = require('../../utils/domainValidation');
function studentScope(user) {
  if (user?.rol === ROLE_SUPER_ADMIN) return null;
  if (user?.rol !== ROLE_DIRECTOR_CARRERA) throw httpError(403, 'Sin permiso para consultar expedientes');
  return user.carreras_permitidas || [];
}
async function assertStudent(id, user) {
  const scope = studentScope(user);
  const {rows} = await db.query('SELECT id_carrera FROM estudiante WHERE id_estudiante=$1',[id]);
  if (!rows.length) throw httpError(404,'Estudiante no encontrado');
  if (scope !== null && (!Array.isArray(scope) || !scope.includes(rows[0].id_carrera))) {
    throw httpError(403,'Estudiante fuera de su Dirección o carrera asignada');
  }
}


// ═══════════════════════════════════════════
// DOCENTES
// ═══════════════════════════════════════════

async function getAllDocentes(user) {
  const isPrivileged = [ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA].includes(user?.rol);
  const { rows } = await db.query(`
    SELECT d.id_docente,
           p.nombres, p.apellidos, ${isPrivileged ? 'p.nro_documento,' : ''}
           tc.nombre_contrato
    FROM docente d
    JOIN persona p ON d.id_persona = p.id_persona
    JOIN tipo_contrato tc ON d.id_tipo_contrato = tc.id_tipo_contrato
    ORDER BY p.apellidos, p.nombres
  `);
  return rows;
}

async function getDocenteById(id, user) {
  const isPrivileged = [ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA].includes(user?.rol);
  if (!isPrivileged) {
    const {rows} = await db.query(`
      SELECT d.id_docente, d.id_tipo_contrato,
             p.nombres, p.apellidos,
             tc.nombre_contrato
      FROM docente d
      JOIN persona p USING(id_persona)
      JOIN tipo_contrato tc USING(id_tipo_contrato)
      WHERE d.id_docente=$1
    `, [id]);
    return rows[0] || null;
  }
  const { rows } = await db.query(`
    SELECT d.id_docente, d.id_tipo_contrato,
           p.id_persona, p.nombres, p.apellidos, p.nro_documento,
           p.fecha_nacimiento,
           td.sigla AS tipo_doc, td.nombre_documento,
           n.nombre_pais AS nacionalidad,
           tc.nombre_contrato
    FROM docente d
    JOIN persona p ON d.id_persona = p.id_persona
    JOIN tipo_documento td ON p.id_tipo_doc = td.id_tipo_doc
    JOIN nacionalidad n ON p.id_nacionalidad = n.id_nacionalidad
    JOIN tipo_contrato tc ON d.id_tipo_contrato = tc.id_tipo_contrato
    WHERE d.id_docente = $1
  `, [id]);
  return rows[0] || null;
}

async function createDocente({ id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos, fecha_nacimiento, id_tipo_contrato }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const persona = await client.query(`
      INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos, fecha_nacimiento)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_persona
    `, [id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos, fecha_nacimiento || null]);
    const docente = await client.query(`
      INSERT INTO docente (id_persona, id_tipo_contrato) VALUES ($1, $2)
      RETURNING id_docente
    `, [persona.rows[0].id_persona, id_tipo_contrato]);
    await client.query('COMMIT');
    return { id_docente: docente.rows[0].id_docente, id_persona: persona.rows[0].id_persona, nombres, apellidos };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

/**
 * Obtiene las carreras a las que pertenece un docente.
 */
async function getCarrerasDocente(idDocente) {
  const { rows } = await db.query(`
    SELECT dc_rel.id_doc_car,
           dc.id_carrera, dc.nombre_carrera, dc.sigla
    FROM docente_carrera dc_rel
    JOIN direccion_carrera dc ON dc_rel.id_carrera = dc.id_carrera
    WHERE dc_rel.id_docente = $1
  `, [idDocente]);
  return rows;
}

/**
 * Obtiene los horarios de un docente en el periodo activo.
 */
async function getHorariosDocente(idDocente) {
  const { rows } = await db.query(`
    SELECT hc.id_horario, hc.id_grupo, hc.id_tipo_clase, gm.id_periodo, pe.id_carrera,
           a.nombre_codigo AS aula,
           ds.nombre_dia, ds.nro_dia_iso,
           bh.hora_inicio, bh.hora_fin,
           tc.nombre_tipo AS tipo_clase,
           m.nombre_materia, m.sigla AS sigla_materia, gm.nombre_grupo
    FROM asignacion_docente ad
    JOIN grupo_materia gm ON ad.id_grupo = gm.id_grupo
    JOIN periodo_academico pa ON gm.id_periodo = pa.id_periodo
    JOIN horario_clase hc ON hc.id_grupo = gm.id_grupo
    JOIN aula a ON hc.id_aula = a.id_aula
    JOIN dia_semana ds ON hc.id_dia = ds.id_dia
    JOIN bloque_horario bh ON hc.id_bloque = bh.id_bloque
    JOIN tipo_clase tc ON hc.id_tipo_clase = tc.id_tipo_clase
    JOIN materia_plan mp ON gm.id_mat_plan = mp.id_mat_plan
    JOIN materia m ON mp.id_materia = m.id_materia
    JOIN plan_estudio pe ON pe.id_plan = mp.id_plan
    WHERE ad.id_docente = $1
      AND pa.id_periodo = (SELECT id_periodo FROM (${PERIODO_ACTIVO_SQL}) periodo_activo)
    ORDER BY ds.nro_dia_iso, bh.hora_inicio
  `, [idDocente]);
  return rows;
}

// ═══════════════════════════════════════════
// ESTUDIANTES
// ═══════════════════════════════════════════

async function getAllEstudiantes({ idCarrera } = {}, user) {
  const scope = studentScope(user);
  if (scope !== null && (!Array.isArray(scope) || scope.length === 0)) {
    return [];
  }
  let query = `
    SELECT e.id_estudiante, e.matricula,
           p.nombres, p.apellidos, p.nro_documento,
           dc.nombre_carrera
    FROM estudiante e
    JOIN persona p ON e.id_persona = p.id_persona
    JOIN direccion_carrera dc ON e.id_carrera = dc.id_carrera
  `;
  const params = [];
  const conditions = [];
  if (idCarrera) {
    params.push(idCarrera);
    conditions.push(`e.id_carrera = $${params.length}`);
  }
  if (scope !== null) {
    params.push(scope);
    conditions.push(`e.id_carrera = ANY($${params.length}::int[])`);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY p.apellidos, p.nombres';
  const { rows } = await db.query(query, params);
  return rows;
}

async function getEstudianteById(id, user) {
  await assertStudent(id, user);
  const { rows } = await db.query(`
    SELECT e.id_estudiante, e.matricula,
           p.id_persona, p.nombres, p.apellidos, p.nro_documento,
           p.fecha_nacimiento,
           td.sigla AS tipo_doc,
           n.nombre_pais AS nacionalidad,
           dc.id_carrera, dc.nombre_carrera
    FROM estudiante e
    JOIN persona p ON e.id_persona = p.id_persona
    JOIN tipo_documento td ON p.id_tipo_doc = td.id_tipo_doc
    JOIN nacionalidad n ON p.id_nacionalidad = n.id_nacionalidad
    JOIN direccion_carrera dc ON e.id_carrera = dc.id_carrera
    WHERE e.id_estudiante = $1
  `, [id]);
  return rows[0] || null;
}

/**
 * Obtiene las inscripciones de un estudiante en el periodo activo.
 */
async function getInscripciones(idEstudiante, user) {
  await assertStudent(idEstudiante, user);
  const { rows } = await db.query(`
    SELECT ins.id_inscripcion, ins.fecha_inscripcion,
           gm.nombre_grupo,
           m.nombre_materia, m.sigla,
           pa.gestion
    FROM inscripcion ins
    JOIN grupo_materia gm ON ins.id_grupo = gm.id_grupo
    JOIN materia_plan mp ON gm.id_mat_plan = mp.id_mat_plan
    JOIN materia m ON mp.id_materia = m.id_materia
    JOIN periodo_academico pa ON gm.id_periodo = pa.id_periodo
    WHERE ins.id_estudiante = $1
      AND pa.id_periodo = (SELECT id_periodo FROM (${PERIODO_ACTIVO_SQL}) periodo_activo)
    ORDER BY m.nombre_materia
  `, [idEstudiante]);
  return rows;
}

// ═══════════════════════════════════════════
// DIRECTORES DE CARRERA
// ═══════════════════════════════════════════

async function getAllDirectores() {
  const { rows } = await db.query(`
    SELECT dir.id_director, dir.fecha_posesion,
           p.nombres, p.apellidos,
           dc.id_direccion, dc.nombre_direccion
    FROM director_carrera dir
    JOIN persona p ON dir.id_persona = p.id_persona
    JOIN direccion_academica dc ON dir.id_direccion = dc.id_direccion
    ORDER BY dc.nombre_direccion
  `);
  return rows;
}

async function getDirectorByCarrera(idCarrera) {
  const { rows } = await db.query(`
    SELECT dir.id_director, dir.fecha_posesion,
           p.id_persona, p.nombres, p.apellidos
    FROM director_carrera dir
    JOIN persona p ON dir.id_persona = p.id_persona
    JOIN direccion_carrera c ON c.id_direccion=dir.id_direccion
    JOIN usuario u ON u.id_persona=dir.id_persona AND u.id_direccion=dir.id_direccion AND u.rol='ROLE_DIRECTOR_CARRERA'
    WHERE c.id_carrera = $1
    ORDER BY dir.fecha_posesion DESC, dir.id_director DESC
    LIMIT 1
  `, [idCarrera]);
  return rows[0] || null;
}

// ═══════════════════════════════════════════
// CATÁLOGOS DE PERSONA
// ═══════════════════════════════════════════

async function getAllTiposDocumento() {
  const { rows } = await db.query(`SELECT * FROM tipo_documento ORDER BY nombre_documento`);
  return rows;
}

async function getAllNacionalidades() {
  const { rows } = await db.query(`SELECT * FROM nacionalidad ORDER BY nombre_pais`);
  return rows;
}

async function getAllTiposContrato() {
  const { rows } = await db.query(`SELECT * FROM tipo_contrato ORDER BY nombre_contrato`);
  return rows;
}

async function getAllEstadosUsuario() {
  const { rows } = await db.query(`SELECT * FROM estado_usuario ORDER BY nombre_estado`);
  return rows;
}

module.exports = {
  // Docentes
  getAllDocentes, getDocenteById, createDocente, getCarrerasDocente, getHorariosDocente,
  // Estudiantes
  getAllEstudiantes, getEstudianteById, getInscripciones,
  // Directores
  getAllDirectores, getDirectorByCarrera,
  // Catálogos
  getAllTiposDocumento, getAllNacionalidades, getAllTiposContrato, getAllEstadosUsuario
};
