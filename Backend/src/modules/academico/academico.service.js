const { PERIODO_ACTIVO_SQL } = require('../../utils/periodoActivo');
const { buscarChoquesDocente, errorChoqueDocente } = require('../../utils/choqueDocente');
// src/modules/academico/academico.service.js
const db = require('../../config/db');
const { positiveId, httpError } = require('../../utils/domainValidation');

// ═══════════════════════════════════════════
// PERIODO ACADÉMICO
// ═══════════════════════════════════════════

async function getAllPeriodos() {
  const { rows } = await db.query(`
    SELECT id_periodo, gestion, fecha_inicio, fecha_fin, activo
    FROM periodo_academico
    ORDER BY fecha_inicio DESC
  `);
  return rows;
}

async function getPeriodoActivo() {
  const { rows } = await db.query(PERIODO_ACTIVO_SQL);
  return rows[0] || null;
}

// Activacion atomica: el bloqueo serializa cambios de periodo concurrentes.
async function guardarPeriodo(operation) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('LOCK TABLE periodo_academico IN SHARE ROW EXCLUSIVE MODE');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

async function createPeriodo({ gestion, fecha_inicio, fecha_fin, activo }) {
  return guardarPeriodo(async (client) => {
    if (activo === true) await client.query('UPDATE periodo_academico SET activo = FALSE WHERE activo = TRUE');
    const { rows } = await client.query(`
      INSERT INTO periodo_academico (gestion, fecha_inicio, fecha_fin, activo)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [gestion, fecha_inicio, fecha_fin, activo === true]);
    return rows[0];
  });
}

async function updatePeriodo(id, { gestion, fecha_inicio, fecha_fin, activo }) {
  return guardarPeriodo(async (client) => {
    const existing = await client.query('SELECT id_periodo FROM periodo_academico WHERE id_periodo = $1', [id]);
    if (!existing.rows.length) return null;
    if (activo === true) await client.query('UPDATE periodo_academico SET activo = FALSE WHERE activo = TRUE AND id_periodo <> $1', [id]);
    const { rows } = await client.query(`
      UPDATE periodo_academico SET gestion = $1, fecha_inicio = $2, fecha_fin = $3, activo = $4
      WHERE id_periodo = $5 RETURNING *
    `, [gestion, fecha_inicio, fecha_fin, activo, id]);
    return rows[0] || null;
  });
}

// ═══════════════════════════════════════════
// MATERIA Y CARGA HORARIA
// ═══════════════════════════════════════════

async function getAllMaterias() {
  const { rows } = await db.query(`
    SELECT m.id_materia, m.nombre_materia, m.sigla,
           m.id_area, ac.nombre_area,
           COALESCE(carga.horas_semana, 0) AS horas_semana,
           carga.horas_semana AS carga_horaria,
           plan.semestre,
           plan.id_plan,
           plan.id_mat_plan,
           plan.id_carrera,
           COALESCE(grupos.cantidad_grupos, 0)::INT AS cantidad_grupos,
           COALESCE(grupos.grupos, '[]'::json) AS grupos
    FROM materia m
    JOIN area_conocimiento ac ON m.id_area = ac.id_area
    LEFT JOIN (
      SELECT id_materia, SUM(horas_semana)::INT AS horas_semana
      FROM materia_carga_horaria
      GROUP BY id_materia
    ) carga ON carga.id_materia = m.id_materia
    LEFT JOIN (
      SELECT DISTINCT ON (mp.id_materia) mp.id_materia,
             sn.descripcion AS semestre, mp.id_plan, mp.id_mat_plan, pe.id_carrera
      FROM materia_plan mp
      JOIN semestre_nivel sn ON sn.id_semestre = mp.id_semestre
      JOIN plan_estudio pe ON pe.id_plan = mp.id_plan
      ORDER BY mp.id_materia, pe.vigente DESC, mp.id_plan
    ) plan ON plan.id_materia = m.id_materia
    LEFT JOIN (
      SELECT mp.id_materia,
             COUNT(gm.id_grupo) AS cantidad_grupos,
             json_agg(json_build_object('id_grupo', gm.id_grupo, 'nombre_grupo', gm.nombre_grupo)) AS grupos
      FROM materia_plan mp
      JOIN grupo_materia gm ON gm.id_mat_plan = mp.id_mat_plan
      JOIN (${PERIODO_ACTIVO_SQL}) pa ON pa.id_periodo = gm.id_periodo
      GROUP BY mp.id_materia
    ) grupos ON grupos.id_materia = m.id_materia
    ORDER BY m.nombre_materia
  `);
  return rows;
}

async function getMateriaById(id) {
  const { rows } = await db.query(`
    SELECT m.id_materia, m.nombre_materia, m.sigla,
           ac.id_area, ac.nombre_area
    FROM materia m
    JOIN area_conocimiento ac ON m.id_area = ac.id_area
    WHERE m.id_materia = $1
  `, [id]);
  return rows[0] || null;
}

async function createMateria({ id_area, nombre_materia, sigla }) {
  positiveId(id_area, 'Área');
  if (![nombre_materia, sigla].every(x => typeof x === 'string' && x.trim())) throw httpError(400, 'Nombre y sigla obligatorios');
  const { rows } = await db.query(`
    INSERT INTO materia (id_area, nombre_materia, sigla)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [id_area, nombre_materia.trim(), sigla.trim()]);
  return rows[0];
}

async function updateMateria(id, { id_area, nombre_materia, sigla }) {
  positiveId(id, 'Materia');
  const { rows } = await db.query(`
    UPDATE materia SET
      id_area = COALESCE($1, id_area),
      nombre_materia = COALESCE($2, nombre_materia),
      sigla = COALESCE($3, sigla)
    WHERE id_materia = $4
    RETURNING *
  `, [id_area || null, nombre_materia ? nombre_materia.trim() : null, sigla ? sigla.trim() : null, id]);
  return rows[0] || null;
}

async function deleteMateria(id) {
  positiveId(id, 'Materia');
  const { rowCount } = await db.query('DELETE FROM materia WHERE id_materia = $1', [id]);
  return rowCount > 0;
}

/**
 * Obtiene la carga horaria de una materia (teoría, práctica, lab, etc.)
 */
async function getCargaHoraria(idMateria) {
  positiveId(idMateria, 'Materia');
  const { rows } = await db.query(`
    SELECT mch.id_carga, mch.horas_semana,
           tc.id_tipo_clase, tc.nombre_tipo
    FROM materia_carga_horaria mch
    JOIN tipo_clase tc ON mch.id_tipo_clase = tc.id_tipo_clase
    WHERE mch.id_materia = $1
    ORDER BY tc.id_tipo_clase
  `, [idMateria]);
  return rows;
}

/**
 * Configura las cargas horarias de una materia de forma transaccional.
 */
async function updateCargaHoraria(idMateria, cargas) {
  positiveId(idMateria, 'Materia');
  if (!Array.isArray(cargas) || !cargas.length) {
    throw httpError(400, 'Debe especificar al menos una carga horaria');
  }

  const types = new Set();
  for (const carga of cargas) {
    const type = positiveId(carga.id_tipo_clase, 'Tipo de clase');
    if (types.has(type) || !Number.isSafeInteger(Number(carga.horas_semana)) || Number(carga.horas_semana) <= 0) {
      throw httpError(400, 'Cada sesión debe tener horas enteras positivas y sin tipos repetidos');
    }
    types.add(type);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT bloquear_calendario()');

    // Bloqueo de grupos asociados a la materia antes de cambiar cuotas
    await client.query(`
      SELECT g.id_grupo FROM grupo_materia g
      JOIN materia_plan mp USING(id_mat_plan)
      WHERE mp.id_materia = $1 ORDER BY g.id_grupo FOR UPDATE OF g
    `, [idMateria]);

    const matExists = await client.query('SELECT id_materia FROM materia WHERE id_materia = $1 FOR UPDATE', [idMateria]);
    if (!matExists.rowCount) throw httpError(404, 'Materia no encontrada');

    // Comprobar que los horarios ya planificados no superen la nueva cuota
    const planned = (await client.query(`
      SELECT h.id_tipo_clase, g.id_grupo, SUM(EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio))) / 3600 AS horas
      FROM horario_clase h
      JOIN grupo_materia g USING(id_grupo)
      JOIN materia_plan mp USING(id_mat_plan)
      JOIN bloque_horario b USING(id_bloque)
      WHERE mp.id_materia = $1
      GROUP BY h.id_tipo_clase, g.id_grupo
    `, [idMateria])).rows;

    for (const row of planned) {
      const quota = cargas.find(x => Number(x.id_tipo_clase) === row.id_tipo_clase);
      if (!quota || Number(quota.horas_semana) < Number(row.horas)) {
        throw httpError(409, `La reducción de horas dejaría horarios excedidos en el grupo ${row.id_grupo}`);
      }
    }

    for (const carga of cargas) {
      await client.query(`
        INSERT INTO materia_carga_horaria (id_materia, id_tipo_clase, horas_semana)
        VALUES ($1, $2, $3)
        ON CONFLICT (id_materia, id_tipo_clase)
        DO UPDATE SET horas_semana = EXCLUDED.horas_semana
      `, [idMateria, carga.id_tipo_clase, carga.horas_semana]);
    }

    // Retirar los tipos de clase que ya no formen parte de la configuración
    await client.query(`
      DELETE FROM materia_carga_horaria
      WHERE id_materia = $1 AND NOT(id_tipo_clase = ANY($2::int[]))
    `, [idMateria, [...types]]);

    await client.query('COMMIT');
    return await getCargaHoraria(idMateria);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════
// PLAN DE ESTUDIO Y MATERIA_PLAN
// ═══════════════════════════════════════════

async function getPlanesByCarrera(idCarrera) {
  positiveId(idCarrera, 'Carrera');
  const { rows } = await db.query(`
    SELECT id_plan, nombre_plan, resolucion, vigente
    FROM plan_estudio
    WHERE id_carrera = $1
    ORDER BY vigente DESC, nombre_plan
  `, [idCarrera]);
  return rows;
}

async function getAllPlanes() {
  const { rows } = await db.query(`
    SELECT pe.id_plan, pe.nombre_plan, pe.resolucion, pe.vigente,
           dc.id_carrera, dc.nombre_carrera, dc.sigla
    FROM plan_estudio pe
    JOIN direccion_carrera dc ON pe.id_carrera = dc.id_carrera
    ORDER BY pe.vigente DESC, dc.nombre_carrera, pe.nombre_plan
  `);
  return rows;
}

async function getPlanById(id) {
  positiveId(id, 'Plan de estudio');
  const { rows } = await db.query(`
    SELECT pe.id_plan, pe.nombre_plan, pe.resolucion, pe.vigente,
           dc.id_carrera, dc.nombre_carrera, dc.sigla
    FROM plan_estudio pe
    JOIN direccion_carrera dc ON pe.id_carrera = dc.id_carrera
    WHERE pe.id_plan = $1
  `, [id]);
  return rows[0] || null;
}

async function createPlan({ id_carrera, nombre_plan, resolucion, vigente }) {
  positiveId(id_carrera, 'Carrera');
  if (typeof nombre_plan !== 'string' || !nombre_plan.trim()) throw httpError(400, 'Nombre de plan obligatorio');
  const { rows } = await db.query(`
    INSERT INTO plan_estudio (id_carrera, nombre_plan, resolucion, vigente)
    VALUES ($1, $2, $3, $4) RETURNING *
  `, [id_carrera, nombre_plan.trim(), resolucion || null, vigente ?? true]);
  return rows[0];
}

async function updatePlan(id, { id_carrera, nombre_plan, resolucion, vigente }) {
  positiveId(id, 'Plan de estudio');
  const { rows } = await db.query(`
    UPDATE plan_estudio SET
      id_carrera = COALESCE($1, id_carrera),
      nombre_plan = COALESCE($2, nombre_plan),
      resolucion = COALESCE($3, resolucion),
      vigente = COALESCE($4, vigente)
    WHERE id_plan = $5 RETURNING *
  `, [id_carrera || null, nombre_plan ? nombre_plan.trim() : null, resolucion || null, vigente, id]);
  return rows[0] || null;
}

async function deletePlan(id) {
  positiveId(id, 'Plan de estudio');
  const { rowCount } = await db.query('DELETE FROM plan_estudio WHERE id_plan = $1', [id]);
  return rowCount > 0;
}

/**
 * Obtiene las materias de un plan de estudio con su semestre y cargas horarias.
 */
async function getMateriasByPlan(idPlan) {
  positiveId(idPlan, 'Plan de estudio');
  const { rows } = await db.query(`
    SELECT mp.id_mat_plan, mp.id_materia, mp.id_plan,
           m.nombre_materia, m.sigla,
           sn.id_semestre, sn.descripcion AS semestre,
           COALESCE(
             (SELECT json_agg(json_build_object(
               'id_carga', mch.id_carga,
               'id_tipo_clase', mch.id_tipo_clase,
               'nombre_tipo', tc.nombre_tipo,
               'horas_semana', mch.horas_semana
             ) ORDER BY tc.id_tipo_clase)
              FROM materia_carga_horaria mch
              JOIN tipo_clase tc ON tc.id_tipo_clase = mch.id_tipo_clase
              WHERE mch.id_materia = m.id_materia),
             '[]'::json
           ) AS cargas
    FROM materia_plan mp
    JOIN materia m ON mp.id_materia = m.id_materia
    JOIN semestre_nivel sn ON mp.id_semestre = sn.id_semestre
    WHERE mp.id_plan = $1
    ORDER BY sn.id_semestre, m.nombre_materia
  `, [idPlan]);
  return rows;
}

async function getMateriaPlanById(id) {
  positiveId(id, 'Materia-Plan');
  const { rows } = await db.query(`
    SELECT mp.id_mat_plan, mp.id_materia, mp.id_plan, mp.id_semestre,
           m.nombre_materia, m.sigla,
           sn.descripcion AS semestre,
           pe.nombre_plan,
           COALESCE(
             (SELECT json_agg(json_build_object(
               'id_tipo_clase', mch.id_tipo_clase,
               'nombre_tipo', tc.nombre_tipo,
               'horas_semana', mch.horas_semana
             ) ORDER BY tc.id_tipo_clase)
              FROM materia_carga_horaria mch
              JOIN tipo_clase tc ON tc.id_tipo_clase = mch.id_tipo_clase
              WHERE mch.id_materia = m.id_materia),
             '[]'::json
           ) AS cargas
    FROM materia_plan mp
    JOIN materia m ON mp.id_materia = m.id_materia
    JOIN semestre_nivel sn ON mp.id_semestre = sn.id_semestre
    JOIN plan_estudio pe ON mp.id_plan = pe.id_plan
    WHERE mp.id_mat_plan = $1
  `, [id]);
  return rows[0] || null;
}

/**
 * Asocia/vincula una materia a un plan de estudio (materia_plan).
 */
async function vincularMateriaPlan({ id_materia, id_plan, id_semestre }) {
  positiveId(id_materia, 'Materia');
  positiveId(id_plan, 'Plan de estudio');
  positiveId(id_semestre, 'Semestre');

  const mat = await db.query('SELECT 1 FROM materia WHERE id_materia = $1', [id_materia]);
  if (!mat.rowCount) throw httpError(404, 'Materia no encontrada');

  const plan = await db.query('SELECT 1 FROM plan_estudio WHERE id_plan = $1', [id_plan]);
  if (!plan.rowCount) throw httpError(404, 'Plan de estudio no encontrado');

  const sem = await db.query('SELECT 1 FROM semestre_nivel WHERE id_semestre = $1', [id_semestre]);
  if (!sem.rowCount) throw httpError(404, 'Semestre no encontrado');

  const { rows } = await db.query(`
    INSERT INTO materia_plan (id_materia, id_plan, id_semestre)
    VALUES ($1, $2, $3)
    ON CONFLICT (id_materia, id_plan)
    DO UPDATE SET id_semestre = EXCLUDED.id_semestre
    RETURNING id_mat_plan
  `, [id_materia, id_plan, id_semestre]);

  return await getMateriaPlanById(rows[0].id_mat_plan);
}

async function updateMateriaPlan(idMatPlan, { id_semestre }) {
  positiveId(idMatPlan, 'Materia-Plan');
  positiveId(id_semestre, 'Semestre');

  const sem = await db.query('SELECT 1 FROM semestre_nivel WHERE id_semestre = $1', [id_semestre]);
  if (!sem.rowCount) throw httpError(404, 'Semestre no encontrado');

  const { rows } = await db.query(`
    UPDATE materia_plan
    SET id_semestre = $1
    WHERE id_mat_plan = $2
    RETURNING id_mat_plan
  `, [id_semestre, idMatPlan]);

  if (!rows.length) throw httpError(404, 'Registro materia-plan no encontrado');
  return await getMateriaPlanById(rows[0].id_mat_plan);
}

async function desvincularMateriaPlan(idMatPlan) {
  positiveId(idMatPlan, 'Materia-Plan');

  // Validar si existen grupos asociados
  const groups = await db.query('SELECT COUNT(*) FROM grupo_materia WHERE id_mat_plan = $1', [idMatPlan]);
  if (parseInt(groups.rows[0].count) > 0) {
    throw httpError(409, `No se puede desvincular la materia del plan: contiene ${groups.rows[0].count} grupo(s) aperturado(s).`);
  }

  // Eliminar prerrequisitos que involucren este nodo
  await db.query('DELETE FROM prerequisito_materia WHERE id_mat_plan = $1 OR id_mat_req = $1', [idMatPlan]);

  const { rowCount } = await db.query('DELETE FROM materia_plan WHERE id_mat_plan = $1', [idMatPlan]);
  if (rowCount === 0) throw httpError(404, 'Registro materia-plan no encontrado');
  return true;
}

/**
 * Operación fluida: Vincula materia al plan y actualiza sus cargas horarias.
 */
async function vincularMateriaPlanConCarga({ id_materia, id_plan, id_semestre, cargas }) {
  const mp = await vincularMateriaPlan({ id_materia, id_plan, id_semestre });
  let cargasActualizadas = null;
  if (Array.isArray(cargas) && cargas.length > 0) {
    cargasActualizadas = await updateCargaHoraria(id_materia, cargas);
  } else {
    cargasActualizadas = await getCargaHoraria(id_materia);
  }
  return { materia_plan: mp, cargas: cargasActualizadas };
}

// ═══════════════════════════════════════════
// DIRECCIÓN DE CARRERA
// ═══════════════════════════════════════════

async function getAllCarreras() {
  const { rows } = await db.query(`
    SELECT dc.id_carrera, dc.nombre_carrera, dc.sigla, dc.id_direccion,
           me.nombre_modalidad,
           f.nombre_facultad
    FROM direccion_carrera dc
    JOIN modalidad_estudio me ON dc.id_modalidad = me.id_modalidad
    JOIN facultad f ON dc.id_facultad = f.id_facultad
    ORDER BY f.nombre_facultad, dc.nombre_carrera
  `);
  return rows;
}

async function getCarreraById(id) {
  positiveId(id, 'Carrera');
  const { rows } = await db.query(`
    SELECT dc.id_carrera, dc.nombre_carrera, dc.sigla, dc.id_direccion,
           me.nombre_modalidad,
           f.nombre_facultad, f.id_facultad
    FROM direccion_carrera dc
    JOIN modalidad_estudio me ON dc.id_modalidad = me.id_modalidad
    JOIN facultad f ON dc.id_facultad = f.id_facultad
    WHERE dc.id_carrera = $1
  `, [id]);
  return rows[0] || null;
}

async function createCarrera({ id_facultad, id_modalidad, nombre_carrera, sigla, id_direccion }) {
  if (!Number.isSafeInteger(Number(id_direccion)) || Number(id_direccion) <= 0) {
    throw httpError(400, 'Selecciona una Dirección para la carrera');
  }
  const { rows } = await db.query(`
    INSERT INTO direccion_carrera (id_facultad, id_modalidad, nombre_carrera, sigla, id_direccion)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [id_facultad, id_modalidad, nombre_carrera, sigla || null, id_direccion]);
  return rows[0];
}

async function updateCarrera(id, { id_facultad, id_modalidad, nombre_carrera, sigla }) {
  positiveId(id, 'Carrera');
  const { rows } = await db.query(`
    UPDATE direccion_carrera SET
      id_facultad = COALESCE($1, id_facultad),
      id_modalidad = COALESCE($2, id_modalidad),
      nombre_carrera = COALESCE($3, nombre_carrera),
      sigla = COALESCE($4, sigla)
    WHERE id_carrera = $5 RETURNING *
  `, [id_facultad || null, id_modalidad || null, nombre_carrera, sigla || null, id]);
  return rows[0] || null;
}

async function deleteCarrera(id) {
  positiveId(id, 'Carrera');
  const { rowCount } = await db.query('DELETE FROM direccion_carrera WHERE id_carrera = $1', [id]);
  return rowCount > 0;
}

// ═══════════════════════════════════════════
// PRERREQUISITOS
// ═══════════════════════════════════════════

async function getPrerequisitos(idMatPlan) {
  positiveId(idMatPlan, 'Materia-Plan');
  const { rows } = await db.query(`
    SELECT pr.id_prerequisito, pr.id_mat_plan, pr.id_mat_req,
           m.sigla, m.nombre_materia
    FROM prerequisito_materia pr
    JOIN materia_plan mp ON mp.id_mat_plan = pr.id_mat_req
    JOIN materia m ON m.id_materia = mp.id_materia
    WHERE pr.id_mat_plan = $1
  `, [idMatPlan]);
  return rows;
}

async function createPrerequisito({ id_mat_plan, id_mat_req }) {
  positiveId(id_mat_plan, 'Materia Plan');
  positiveId(id_mat_req, 'Materia Requisito');
  if (Number(id_mat_plan) === Number(id_mat_req)) throw httpError(400, 'Una materia no puede ser prerrequisito de sí misma');
  const { rows } = await db.query(`
    INSERT INTO prerequisito_materia (id_mat_plan, id_mat_req)
    VALUES ($1, $2) RETURNING *
  `, [id_mat_plan, id_mat_req]);
  return rows[0];
}

async function deletePrerequisito(id) {
  positiveId(id, 'Prerrequisito');
  const { rowCount } = await db.query('DELETE FROM prerequisito_materia WHERE id_prerequisito = $1', [id]);
  return rowCount > 0;
}

// ═══════════════════════════════════════════
// GRUPOS Y ASIGNACIÓN DOCENTE
// ═══════════════════════════════════════════

async function getGruposByPeriodo(idPeriodo) {
  positiveId(idPeriodo, 'Periodo');
  const { rows } = await db.query(`
    SELECT gm.id_grupo, gm.nombre_grupo,
           eg.nombre_estado AS estado_grupo,
           m.id_materia, m.nombre_materia, m.sigla AS sigla_materia,
           sn.descripcion AS semestre,
           dc.id_carrera, dc.nombre_carrera,
           pa.gestion
    FROM grupo_materia gm
    JOIN materia_plan       mp ON gm.id_mat_plan      = mp.id_mat_plan
    JOIN materia             m ON mp.id_materia       = m.id_materia
    JOIN semestre_nivel     sn ON mp.id_semestre      = sn.id_semestre
    JOIN plan_estudio       pe ON mp.id_plan          = pe.id_plan
    JOIN direccion_carrera  dc ON pe.id_carrera       = dc.id_carrera
    JOIN periodo_academico  pa ON gm.id_periodo       = pa.id_periodo
    JOIN estado_grupo       eg ON gm.id_estado_grupo  = eg.id_estado_grupo
    WHERE gm.id_periodo = $1
    ORDER BY dc.nombre_carrera, sn.id_semestre, m.nombre_materia, gm.nombre_grupo
  `, [idPeriodo]);
  return rows;
}

async function createGrupo({ id_mat_plan, id_periodo, id_estado_grupo, nombre_grupo }) {
  positiveId(id_mat_plan, 'Materia-Plan');
  positiveId(id_periodo, 'Periodo');
  positiveId(id_estado_grupo, 'Estado de grupo');
  if (typeof nombre_grupo !== 'string' || !nombre_grupo.trim()) throw httpError(400, 'Nombre de grupo obligatorio');

  const { rows } = await db.query(`
    INSERT INTO grupo_materia (id_mat_plan, id_periodo, id_estado_grupo, nombre_grupo)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `, [id_mat_plan, id_periodo, id_estado_grupo, nombre_grupo.trim()]);
  return rows[0];
}

async function getDocentesByGrupo(idGrupo) {
  positiveId(idGrupo, 'Grupo');
  const { rows } = await db.query(`
    SELECT ad.id_asig_doc,
           d.id_docente,
           p.nombres, p.apellidos,
           tc.nombre_contrato
    FROM asignacion_docente ad
    JOIN docente d ON ad.id_docente = d.id_docente
    JOIN persona p ON d.id_persona = p.id_persona
    JOIN tipo_contrato tc ON d.id_tipo_contrato = tc.id_tipo_contrato
    WHERE ad.id_grupo = $1
    ORDER BY p.apellidos, p.nombres
  `, [idGrupo]);
  return rows;
}

async function asignarDocente({ id_grupo, id_docente }) {
  positiveId(id_grupo, 'Grupo');
  positiveId(id_docente, 'Docente');

  const choques = await buscarChoquesDocente(db, id_docente, id_grupo);
  if (choques.length) throw errorChoqueDocente(choques);

  const { rows } = await db.query(`
    INSERT INTO asignacion_docente (id_grupo, id_docente)
    VALUES ($1, $2)
    RETURNING *
  `, [id_grupo, id_docente]);
  return rows[0];
}

async function desasignarDocente({ id_grupo, id_docente, id_asig_doc }) {
  if (id_asig_doc) {
    positiveId(id_asig_doc, 'Asignación');
    const { rows } = await db.query(`
      DELETE FROM asignacion_docente
      WHERE id_asig_doc = $1
      RETURNING *
    `, [id_asig_doc]);
    if (!rows.length) throw httpError(404, 'Asignación docente no encontrada');
    return rows[0];
  } else {
    positiveId(id_grupo, 'Grupo');
    positiveId(id_docente, 'Docente');
    const { rows } = await db.query(`
      DELETE FROM asignacion_docente
      WHERE id_grupo = $1 AND id_docente = $2
      RETURNING *
    `, [id_grupo, id_docente]);
    if (!rows.length) throw httpError(404, 'El docente no se encuentra asignado a este grupo');
    return rows[0];
  }
}

// ═══════════════════════════════════════════
// CATÁLOGOS AUXILIARES
// ═══════════════════════════════════════════

async function getAllAreasConocimiento() {
  const { rows } = await db.query(`SELECT * FROM area_conocimiento ORDER BY nombre_area`);
  return rows;
}

async function getAllSemestres() {
  const { rows } = await db.query(`SELECT * FROM semestre_nivel ORDER BY id_semestre`);
  return rows;
}

async function getAllModalidades() {
  const { rows } = await db.query(`SELECT * FROM modalidad_estudio ORDER BY nombre_modalidad`);
  return rows;
}

async function getAllTiposClase() {
  const { rows } = await db.query(`SELECT * FROM tipo_clase ORDER BY id_tipo_clase`);
  return rows;
}

async function getAllEstadosGrupo() {
  const { rows } = await db.query(`SELECT * FROM estado_grupo ORDER BY nombre_estado`);
  return rows;
}

async function getAllFacultades() {
  const { rows } = await db.query(`
    SELECT f.id_facultad, f.nombre_facultad,
           c.nombre_campus, i.nombre AS institucion
    FROM facultad f
    JOIN campus c ON f.id_campus = c.id_campus
    JOIN institucion i ON c.id_institucion = i.id_institucion
    ORDER BY f.nombre_facultad
  `);
  return rows;
}

module.exports = {
  // Periodo
  getAllPeriodos, getPeriodoActivo, createPeriodo, updatePeriodo,
  // Materia
  getAllMaterias, getMateriaById, createMateria, updateMateria, deleteMateria, getCargaHoraria, updateCargaHoraria,
  // Plan estudio y Materia Plan
  getPlanesByCarrera, getAllPlanes, getPlanById, getMateriasByPlan,
  createPlan, updatePlan, deletePlan,
  getMateriaPlanById, vincularMateriaPlan, updateMateriaPlan, desvincularMateriaPlan, vincularMateriaPlanConCarga,
  getPrerequisitos, createPrerequisito, deletePrerequisito,
  // Carrera
  getAllCarreras, getCarreraById, createCarrera, updateCarrera, deleteCarrera,
  // Grupo
  getGruposByPeriodo, createGrupo, getDocentesByGrupo, asignarDocente, desasignarDocente,
  // Catálogos
  getAllAreasConocimiento, getAllSemestres, getAllModalidades,
  getAllTiposClase, getAllEstadosGrupo, getAllFacultades
};
