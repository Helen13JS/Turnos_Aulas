const { PERIODO_ACTIVO_SQL } = require('../../utils/periodoActivo');
const { buscarChoquesDocente, errorChoqueDocente } = require('../../utils/choqueDocente');
// src/modules/horarios/horario.service.js
const db = require('../../config/db');
const { assertOperationalRoom, positiveId, httpError } = require('../../utils/domainValidation');
const { parseConstraintError } = require('../../utils/pgErrorParser');

// ═══════════════════════════════════════════
// HORARIO DE CLASE
// ═══════════════════════════════════════════

/**
 * Serializa las escrituras del grupo y compara duraciones reales por sesion.
 * En PUT excluye el registro editado para no contarlo dos veces.
 */
async function validarHorasSemana(client, idGrupo, idTipoClase, idBloque, idHorario = null) {
  await client.query('SELECT id_grupo FROM grupo_materia WHERE id_grupo = $1 FOR UPDATE', [idGrupo]);
  const { rows } = await client.query(`
    SELECT mch.horas_semana,
      EXTRACT(EPOCH FROM (nuevo.hora_fin - nuevo.hora_inicio)) AS nuevas,
      COALESCE((SELECT SUM(EXTRACT(EPOCH FROM (b.hora_fin - b.hora_inicio)))
        FROM horario_clase hc JOIN bloque_horario b USING (id_bloque)
        WHERE hc.id_grupo = gm.id_grupo AND hc.id_tipo_clase = $2
          AND ($4::integer IS NULL OR hc.id_horario <> $4)), 0) AS planificadas
    FROM grupo_materia gm
    JOIN materia_plan mp ON mp.id_mat_plan = gm.id_mat_plan
    JOIN materia_carga_horaria mch ON mch.id_materia = mp.id_materia AND mch.id_tipo_clase = $2
    JOIN bloque_horario nuevo ON nuevo.id_bloque = $3
    WHERE gm.id_grupo = $1
  `, [idGrupo, idTipoClase, idBloque, idHorario]);
  if (!rows.length) throw httpError(400, 'Grupo, bloque o carga horaria no configurados');
  const { horas_semana, planificadas, nuevas } = rows[0];
  const cuotaMax = Number(horas_semana) * 3600;
  const total = Number(planificadas) + Number(nuevas);
  if (total > cuotaMax) {
    const error = new Error(`Horas excedidas: la sesion permite ${horas_semana} h/semana y quedaria con ${total / 3600} h planificadas.`);
    error.statusCode = 400;
    error.status = 400;
    error.conflictCode = 'HORAS_EXCEDIDAS';
    throw error;
  }
}

/**
 * Valida de forma bidireccional si existe una reserva temporal activa en esa misma
 * aula, día y bloque dentro del periodo académico del grupo.
 */
async function validarChoqueReserva(client, idAula, idDia, idBloque, idGrupo) {
  const { rows } = await client.query(`
    SELECT rt.id_reserva, rt.motivo, rt.fecha_reserva, bh.hora_inicio, bh.hora_fin
    FROM reserva_temporal rt
    JOIN bloque_horario bh ON rt.id_bloque = bh.id_bloque
    JOIN bloque_horario nuevo ON nuevo.id_bloque = $3
    JOIN grupo_materia gm ON gm.id_grupo = $4
    WHERE rt.id_aula = $1
      AND rt.id_dia = $2
      AND rt.id_periodo = gm.id_periodo
      AND (bh.hora_inicio < nuevo.hora_fin AND nuevo.hora_inicio < bh.hora_fin)
    LIMIT 1
  `, [idAula, idDia, idBloque, idGrupo]);

  if (rows.length > 0) {
    const r = rows[0];
    const motivo = r.motivo ? ` (${r.motivo})` : '';
    const error = new Error(`Conflicto de reserva: el aula ya tiene una reserva temporal activa${motivo} en el bloque ${r.hora_inicio} - ${r.hora_fin}.`);
    error.status = error.statusCode = 409;
    error.conflictCode = 'CHOQUE_RESERVA';
    throw error;
  }
}

/**
 * Crea un horario de clase.
 *
 * Los triggers nativos de la BD lanzan RAISE EXCEPTION (P0001):
 *   - fn_validar_choque_aula   → "Choque de aula: ..."
 *   - fn_validar_choque_docente → "Choque de docente: ..."
 *
 * Esta función atrapa el P0001 y lo convierte en un error
 * con status 409 y un código de conflicto específico.
 */
async function crearHorarioClase({ id_docente, id_grupo, id_aula, id_dia, id_bloque, id_tipo_clase }, transactionClient = null) {
  const query = `
    INSERT INTO horario_clase (id_grupo, id_aula, id_dia, id_bloque, id_tipo_clase)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `;
  const client = transactionClient || await db.getClient();
  try {
    if (!transactionClient) await client.query('BEGIN');
    await client.query('SELECT bloquear_calendario()');
    for (const [key, value] of Object.entries({id_grupo,id_aula,id_dia,id_bloque,id_tipo_clase})) positiveId(value, key);
    await assertOperationalRoom(client, id_aula);
    await validarChoqueReserva(client, id_aula, id_dia, id_bloque, id_grupo);
    await validarHorasSemana(client, id_grupo, id_tipo_clase, id_bloque);
    if (id_docente) {
      await client.query('INSERT INTO asignacion_docente (id_grupo, id_docente) VALUES ($1, $2) ON CONFLICT (id_grupo, id_docente) DO NOTHING', [id_grupo, id_docente]);
    }
    if (id_docente) {
      const choques = await buscarChoquesDocente(client, id_docente, id_grupo, [{ id_dia, id_bloque }]);
      if (choques.length) throw errorChoqueDocente(choques);
    }
    const { rows } = await client.query(query, [id_grupo, id_aula, id_dia, id_bloque, id_tipo_clase]);
    if (!transactionClient) await client.query('COMMIT');
    return { horario: rows[0], warning: null };
  } catch (err) {
    if (!transactionClient) await client.query('ROLLBACK');
    if (err.conflictCode === 'CHOQUE_DOCENTE' || err.conflictCode === 'CHOQUE_RESERVA') throw err;
    const conflict = parseConstraintError(err);
    if (conflict) {
      const error = new Error(conflict.userMessage);
      error.status = conflict.httpStatus;
      error.conflictCode = conflict.code;
      error.triggerMessage = conflict.triggerMessage;
      throw error;
    }
    throw err;
  } finally { if (!transactionClient) client.release(); }
}

/**
 * Actualiza un horario de clase.
 * También dispara los triggers de choque.
 */
async function updateHorarioClase(idHorario, { id_grupo, id_aula, id_dia, id_bloque, id_tipo_clase }, transactionClient = null) {
  const query = `
    UPDATE horario_clase
    SET id_grupo = $1, id_aula = $2, id_dia = $3, id_bloque = $4, id_tipo_clase = $5
    WHERE id_horario = $6
    RETURNING *
  `;
  const client = transactionClient || await db.getClient();
  try {
    if (!transactionClient) await client.query('BEGIN');
    await client.query('SELECT bloquear_calendario()');
    for (const [key, value] of Object.entries({id_grupo,id_aula,id_dia,id_bloque,id_tipo_clase})) positiveId(value, key);
    await assertOperationalRoom(client, id_aula);
    await validarChoqueReserva(client, id_aula, id_dia, id_bloque, id_grupo);
    const existing = await client.query('SELECT id_horario FROM horario_clase WHERE id_horario = $1 FOR UPDATE', [idHorario]);
    if (!existing.rowCount) {
      if (!transactionClient) await client.query('ROLLBACK');
      return null;
    }
    await validarHorasSemana(client, id_grupo, id_tipo_clase, id_bloque, idHorario);
    const { rows } = await client.query(query, [id_grupo, id_aula, id_dia, id_bloque, id_tipo_clase, idHorario]);
    if (!transactionClient) await client.query('COMMIT');
    return rows[0] || null;
  } catch (err) {
    if (!transactionClient) await client.query('ROLLBACK');
    if (err.conflictCode === 'CHOQUE_DOCENTE' || err.conflictCode === 'CHOQUE_RESERVA') throw err;
    const conflict = parseConstraintError(err);
    if (conflict) {
      const error = new Error(conflict.userMessage);
      error.status = conflict.httpStatus;
      error.conflictCode = conflict.code;
      error.triggerMessage = conflict.triggerMessage;
      throw error;
    }
    throw err;
  } finally { if (!transactionClient) client.release(); }
}

/**
 * Obtiene los horarios de un aula específica con info completa.
 */
async function getByAula(idAula) {
  const query = `
    SELECT hc.id_horario, gm.id_periodo,
           ds.nombre_dia, ds.nro_dia_iso,
           bh.hora_inicio, bh.hora_fin,
           tc.nombre_tipo AS tipo_clase,
           gm.nombre_grupo,
           d.id_docente,
           p.nombres || ' ' || p.apellidos AS nombre_docente,
           m.nombre_materia, m.sigla AS sigla_materia,
           pa.gestion
    FROM horario_clase hc
    JOIN dia_semana     ds ON hc.id_dia         = ds.id_dia
    JOIN bloque_horario bh ON hc.id_bloque      = bh.id_bloque
    JOIN tipo_clase     tc ON hc.id_tipo_clase   = tc.id_tipo_clase
    JOIN grupo_materia  gm ON hc.id_grupo        = gm.id_grupo
    JOIN materia_plan   mp ON gm.id_mat_plan     = mp.id_mat_plan
    JOIN materia         m ON mp.id_materia       = m.id_materia
    JOIN periodo_academico pa ON gm.id_periodo   = pa.id_periodo
    LEFT JOIN asignacion_docente ad ON ad.id_grupo = gm.id_grupo
    LEFT JOIN docente d ON d.id_docente = ad.id_docente
    LEFT JOIN persona p ON p.id_persona = d.id_persona
    WHERE hc.id_aula = $1
      AND gm.id_periodo = (SELECT id_periodo FROM (${PERIODO_ACTIVO_SQL}) periodo_activo)
    ORDER BY ds.nro_dia_iso, bh.hora_inicio
  `;
  const { rows } = await db.query(query, [idAula]);
  return rows;
}

/**
 * Obtiene los horarios de un grupo específico.
 */
async function getByGrupo(idGrupo) {
  const query = `
    SELECT hc.id_horario, gm.id_periodo,
           a.nombre_codigo AS aula,
           ds.nombre_dia, ds.nro_dia_iso,
           bh.hora_inicio, bh.hora_fin,
         tc.nombre_tipo AS tipo_clase,
         gm.nombre_grupo,
         m.nombre_materia, m.sigla AS sigla_materia,
         d.id_docente,
         p.nombres || ' ' || p.apellidos AS nombre_docente
    FROM horario_clase hc
    JOIN aula            a  ON hc.id_aula       = a.id_aula
    JOIN dia_semana     ds  ON hc.id_dia        = ds.id_dia
    JOIN bloque_horario bh  ON hc.id_bloque     = bh.id_bloque
    JOIN tipo_clase     tc  ON hc.id_tipo_clase = tc.id_tipo_clase
    JOIN grupo_materia  gm ON hc.id_grupo      = gm.id_grupo
    JOIN materia_plan   mp ON gm.id_mat_plan   = mp.id_mat_plan
    JOIN materia         m ON mp.id_materia    = m.id_materia
    LEFT JOIN asignacion_docente ad ON ad.id_grupo = gm.id_grupo
    LEFT JOIN docente d ON d.id_docente = ad.id_docente
    LEFT JOIN persona p ON p.id_persona = d.id_persona
    WHERE hc.id_grupo = $1
    ORDER BY ds.nro_dia_iso, bh.hora_inicio
  `;
  const { rows } = await db.query(query, [idGrupo]);
  return rows;
}

/**
 * Vista compacta: disponibilidad de un aula en un periodo.
 * Devuelve una matriz día × bloque con el estado de ocupación (CLASE, RESERVA o DISPONIBLE).
 */
async function getDisponibilidadAula(idAula, idPeriodo) {
  const query = `
    SELECT ds.id_dia, ds.nombre_dia, ds.nro_dia_iso,
           bh.id_bloque, bh.hora_inicio, bh.hora_fin,
           hc.id_horario,
           m.nombre_materia, gm.nombre_grupo,
           rt.id_reserva, rt.motivo AS motivo_reserva, rt.fecha_reserva,
           CASE
             WHEN hc.id_horario IS NOT NULL THEN 'CLASE'
             WHEN rt.id_reserva IS NOT NULL THEN 'RESERVA'
             ELSE 'DISPONIBLE'
           END AS estado_ocupacion
    FROM dia_semana ds
    CROSS JOIN bloque_horario bh
    LEFT JOIN horario_clase hc
      ON hc.id_dia = ds.id_dia
      AND hc.id_bloque = bh.id_bloque
      AND hc.id_aula = $1
      AND hc.id_grupo IN (
        SELECT id_grupo FROM grupo_materia WHERE id_periodo = $2
      )
    LEFT JOIN grupo_materia gm ON hc.id_grupo = gm.id_grupo
    LEFT JOIN materia_plan mp ON gm.id_mat_plan = mp.id_mat_plan
    LEFT JOIN materia m ON mp.id_materia = m.id_materia
    LEFT JOIN reserva_temporal rt
      ON rt.id_aula = $1
      AND rt.id_dia = ds.id_dia
      AND rt.id_bloque = bh.id_bloque
      AND rt.id_periodo = $2
    ORDER BY ds.nro_dia_iso, bh.hora_inicio
  `;
  const { rows } = await db.query(query, [idAula, idPeriodo]);
  return rows;
}

/**
 * Elimina un horario de clase.
 */
async function deleteHorario(idHorario) {
  // Primero verificar que no tenga excepciones asociadas
  const { rows: excepciones } = await db.query(
    `SELECT COUNT(*) AS total FROM excepcion_horario WHERE id_horario = $1`, [idHorario]
  );
  if (parseInt(excepciones[0].total) > 0) {
    const error = new Error('No se puede eliminar: el horario tiene excepciones registradas');
    error.status = 400;
    throw error;
  }

  const { rowCount } = await db.query(
    `DELETE FROM horario_clase WHERE id_horario = $1`, [idHorario]
  );
  return rowCount > 0;
}

// ═══════════════════════════════════════════
// RESERVA TEMPORAL
// ═══════════════════════════════════════════

/**
 * Crea una reserva temporal.
 *
 * El trigger fn_validar_choque_reserva lanza P0001 en dos casos:
 *   - "Choque de reserva: el aula ya tiene un horario regular..."
 *   - "Choque de reserva: el aula ya esta reservada..."
 */
async function crearReservaTemporal({ id_director, id_aula, id_periodo, id_dia, id_bloque, fecha_reserva, motivo }) {
  const query = `
    INSERT INTO reserva_temporal (id_director, id_aula, id_periodo, id_dia, id_bloque, fecha_reserva, motivo)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT bloquear_calendario()');
    await assertOperationalRoom(client, id_aula);
    const { rows } = await client.query(query, [
      id_director, id_aula, id_periodo, id_dia, id_bloque, fecha_reserva, motivo
    ]);
    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    const conflict = parseConstraintError(err);
    if (conflict) {
      const error = new Error(conflict.userMessage);
      error.status = conflict.httpStatus;
      error.conflictCode = conflict.code;
      error.triggerMessage = conflict.triggerMessage;
      throw error;
    }
    throw err;
  } finally { client.release(); }
}

/**
 * Obtiene reservas temporales de un aula.
 */
async function getReservasByAula(idAula) {
  const query = `
    SELECT rt.id_reserva, rt.fecha_reserva, rt.motivo, rt.creado_en,
           ds.nombre_dia,
           bh.hora_inicio, bh.hora_fin,
           p_dir.nombres || ' ' || p_dir.apellidos AS director,
           dc.nombre_direccion
    FROM reserva_temporal rt
    JOIN dia_semana       ds   ON rt.id_dia      = ds.id_dia
    JOIN bloque_horario   bh   ON rt.id_bloque   = bh.id_bloque
    JOIN director_carrera dcar ON rt.id_director  = dcar.id_director
    JOIN persona          p_dir ON dcar.id_persona = p_dir.id_persona
    JOIN direccion_academica dc ON dcar.id_direccion = dc.id_direccion
    WHERE rt.id_aula = $1
    ORDER BY rt.fecha_reserva, bh.hora_inicio
  `;
  const { rows } = await db.query(query, [idAula]);
  return rows;
}

/**
 * Obtiene reservas temporales por fecha (para calendario).
 */
async function getReservasByFecha(fecha) {
  const query = `
    SELECT rt.id_reserva, rt.motivo,
           a.nombre_codigo AS aula,
           ds.nombre_dia,
           bh.hora_inicio, bh.hora_fin,
           p_dir.nombres || ' ' || p_dir.apellidos AS director,
           dc.nombre_direccion
    FROM reserva_temporal rt
    JOIN aula a ON rt.id_aula = a.id_aula
    JOIN dia_semana ds ON rt.id_dia = ds.id_dia
    JOIN bloque_horario bh ON rt.id_bloque = bh.id_bloque
    JOIN director_carrera dcar ON rt.id_director = dcar.id_director
    JOIN persona p_dir ON dcar.id_persona = p_dir.id_persona
    JOIN direccion_academica dc ON dcar.id_direccion = dc.id_direccion
    WHERE rt.fecha_reserva = $1
    ORDER BY a.nombre_codigo, bh.hora_inicio
  `;
  const { rows } = await db.query(query, [fecha]);
  return rows;
}

/**
 * Elimina una reserva temporal.
 */
async function deleteReserva(idReserva) {
  const { rowCount } = await db.query(
    `DELETE FROM reserva_temporal WHERE id_reserva = $1`, [idReserva]
  );
  return rowCount > 0;
}

// ═══════════════════════════════════════════
// BLOQUES HORARIOS Y DÍAS (catálogos)
// ═══════════════════════════════════════════

async function getAllBloques() {
  const { rows } = await db.query(`SELECT * FROM bloque_horario ORDER BY hora_inicio`);
  return rows;
}

async function getAllDias() {
  const { rows } = await db.query(`SELECT * FROM dia_semana ORDER BY nro_dia_iso`);
  return rows;
}

module.exports = {
  // Horario clase
  crearHorarioClase, updateHorarioClase,
  getByAula, getByGrupo, getDisponibilidadAula, deleteHorario,
  // Reserva temporal
  crearReservaTemporal, getReservasByAula, getReservasByFecha, deleteReserva,
  // Catálogos
  getAllBloques, getAllDias
};

function validBatch(items) {
  if (!Array.isArray(items) || !items.length || items.length > 100) throw httpError(400, 'Selecciona entre 1 y 100 bloques');
}
async function crearHorariosLote(items) {
  validBatch(items);
  if (items.some(item => !item || typeof item !== 'object' || Array.isArray(item))) throw httpError(400, 'Bloque invalido');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT bloquear_calendario()');
    // Orden estable para reducir interbloqueos entre lotes.
    const groups = [...new Set(items.map(x => positiveId(x.id_grupo, 'Grupo')))].sort((a,b)=>a-b);
    await client.query('SELECT id_grupo FROM grupo_materia WHERE id_grupo=ANY($1::int[]) ORDER BY id_grupo FOR UPDATE', [groups]);
    const horarios = [];
    for (const item of items) horarios.push((await crearHorarioClase(item, client)).horario);
    await client.query('COMMIT');
    return horarios;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
async function eliminarHorariosLote(input) {
  validBatch(input);
  const ids = [...new Set(input.map(id => positiveId(id, 'Horario')))].sort((a,b)=>a-b);
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT bloquear_calendario()');
    const rows = await client.query('SELECT id_horario FROM horario_clase WHERE id_horario=ANY($1::int[]) ORDER BY id_horario FOR UPDATE', [ids]);
    if (rows.rowCount !== ids.length) throw httpError(404, 'Uno de los horarios ya no existe');
    const deps = await client.query(`SELECT id_horario FROM excepcion_horario WHERE id_horario=ANY($1::int[])
      UNION ALL SELECT id_horario FROM solicitud_cambio WHERE id_horario=ANY($1::int[])`, [ids]);
    if (deps.rowCount) throw httpError(409, 'Un horario tiene solicitudes o excepciones asociadas; no se elimino ningun bloque');
    await client.query('DELETE FROM horario_clase WHERE id_horario=ANY($1::int[])', [ids]);
    await client.query('COMMIT');
    return ids;
  } catch (err) { await client.query('ROLLBACK'); throw err; }
  finally { client.release(); }
}
module.exports.crearHorariosLote = crearHorariosLote;
module.exports.eliminarHorariosLote = eliminarHorariosLote;
