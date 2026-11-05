// src/modules/solicitudes/solicitudes.service.js
const db = require('../../config/db');
const { httpError, positiveId, assertOperationalRoom } = require('../../utils/domainValidation');
const { parseConstraintError } = require('../../utils/pgErrorParser');

// ═══════════════════════════════════════════
// SOLICITUD DE CAMBIO
// ═══════════════════════════════════════════

async function crearSolicitud({ id_docente, id_horario, id_tipo_sol, aula_solicitada, justificacion }) {
  // Estado inicial: pendiente (se espera que id_estado_sol = 1 sea "Pendiente")
  const { rows } = await db.query(`
    INSERT INTO solicitud_cambio (id_docente, id_horario, id_tipo_sol, id_estado_sol, aula_solicitada, justificacion)
    VALUES ($1, $2, $3, 1, $4, $5)
    RETURNING *
  `, [id_docente, id_horario, id_tipo_sol, aula_solicitada || null, justificacion || null]);
  return rows[0];
}

async function getSolicitudesByDocente(idDocente) {
  const { rows } = await db.query(`
    SELECT sc.id_solicitud, sc.fecha_solicitud, sc.justificacion,
           ts.nombre_tipo AS tipo_solicitud,
           es.nombre_estado AS estado,
           a_orig.nombre_codigo AS aula_original,
           a_sol.nombre_codigo AS aula_solicitada,
           m.nombre_materia, gm.nombre_grupo,
           ds.nombre_dia, bh.hora_inicio, bh.hora_fin
    FROM solicitud_cambio sc
    JOIN tipo_solicitud ts ON sc.id_tipo_sol = ts.id_tipo_sol
    JOIN estado_solicitud es ON sc.id_estado_sol = es.id_estado_sol
    JOIN horario_clase hc ON sc.id_horario = hc.id_horario
    JOIN aula a_orig ON hc.id_aula = a_orig.id_aula
    LEFT JOIN aula a_sol ON sc.aula_solicitada = a_sol.id_aula
    JOIN grupo_materia gm ON hc.id_grupo = gm.id_grupo
    JOIN materia_plan mp ON gm.id_mat_plan = mp.id_mat_plan
    JOIN materia m ON mp.id_materia = m.id_materia
    JOIN dia_semana ds ON hc.id_dia = ds.id_dia
    JOIN bloque_horario bh ON hc.id_bloque = bh.id_bloque
    WHERE sc.id_docente = $1
    ORDER BY sc.fecha_solicitud DESC
  `, [idDocente]);
  return rows;
}

/**
 * Obtiene solicitudes pendientes para un director (las de las carreras que dirige).
 */
async function getSolicitudesPendientes(idDirector) {
  const { rows } = await db.query(`
    SELECT sc.id_solicitud, sc.fecha_solicitud, sc.justificacion,
           ts.nombre_tipo AS tipo_solicitud,
           p_doc.nombres || ' ' || p_doc.apellidos AS docente,
           m.nombre_materia, gm.nombre_grupo,
           a_orig.nombre_codigo AS aula_original,
           a_sol.nombre_codigo AS aula_solicitada,
           ds.nombre_dia, bh.hora_inicio, bh.hora_fin
    FROM solicitud_cambio sc
    JOIN estado_solicitud es ON sc.id_estado_sol = es.id_estado_sol
    JOIN tipo_solicitud ts ON sc.id_tipo_sol = ts.id_tipo_sol
    JOIN docente doc ON sc.id_docente = doc.id_docente
    JOIN persona p_doc ON doc.id_persona = p_doc.id_persona
    JOIN horario_clase hc ON sc.id_horario = hc.id_horario
    JOIN aula a_orig ON hc.id_aula = a_orig.id_aula
    LEFT JOIN aula a_sol ON sc.aula_solicitada = a_sol.id_aula
    JOIN grupo_materia gm ON hc.id_grupo = gm.id_grupo
    JOIN materia_plan mp ON gm.id_mat_plan = mp.id_mat_plan
    JOIN materia m ON mp.id_materia = m.id_materia
    JOIN dia_semana ds ON hc.id_dia = ds.id_dia
    JOIN bloque_horario bh ON hc.id_bloque = bh.id_bloque
    JOIN plan_estudio pe ON mp.id_plan = pe.id_plan
    JOIN direccion_carrera c ON c.id_carrera = pe.id_carrera
    JOIN director_carrera dir ON c.id_direccion = dir.id_direccion
    WHERE dir.id_director = $1
      AND es.nombre_estado = 'Pendiente'
    ORDER BY sc.fecha_solicitud ASC
  `, [idDirector]);
  return rows;
}

/**
 * Aprueba o rechaza una solicitud.
 * Registra en historial_aprobacion y actualiza el estado.
 */
async function resolverSolicitud({ id_solicitud, id_director, aprobado, id_motivo_rechazo }) {
  positiveId(id_solicitud, 'Solicitud');
  positiveId(id_director, 'Director');
  if (typeof aprobado !== 'boolean') throw httpError(400, 'aprobado debe ser booleano');
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('SELECT bloquear_calendario()');

    const solicitud = (await client.query(`SELECT s.*,e.nombre_estado FROM solicitud_cambio s
      JOIN estado_solicitud e USING(id_estado_sol) WHERE s.id_solicitud=$1 FOR UPDATE OF s`, [id_solicitud])).rows[0];
    if (!solicitud) throw httpError(404, 'Solicitud no encontrada');
    if (solicitud.nombre_estado !== 'Pendiente') throw httpError(409, 'La solicitud ya fue resuelta');
    if (aprobado) {
      const idAulaSolicitada = solicitud.aula_solicitada || solicitud.id_aula_solicitada;
      if (!idAulaSolicitada) throw httpError(400, 'La solicitud no indica aula de destino');
      const horario = (await client.query('SELECT * FROM horario_clase WHERE id_horario=$1 FOR UPDATE', [solicitud.id_horario])).rows[0];
      if (!horario) throw httpError(404, 'Horario no encontrado');

      // Validar que el aula solicitada esté operativa
      await assertOperationalRoom(client, idAulaSolicitada);

      // Aplicar de forma transaccional el cambio en el horario oficial
      const updateResult = await client.query(
        'UPDATE horario_clase SET id_aula = $1 WHERE id_horario = $2 RETURNING *',
        [idAulaSolicitada, horario.id_horario]
      );
      if (!updateResult.rowCount) {
        throw httpError(404, 'No se pudo actualizar el aula del horario');
      }
    }

    // Determinar nuevo estado (se espera: 2 = Aprobada, 3 = Rechazada)
    const estadoQ = await client.query(
      `SELECT id_estado_sol FROM estado_solicitud WHERE nombre_estado = $1 ORDER BY id_estado_sol LIMIT 1`,
      [aprobado ? 'Aprobada' : 'Rechazada']
    );
    const nuevoEstado = estadoQ.rows[0]?.id_estado_sol;
    if (!nuevoEstado) throw new Error('Estado de solicitud no encontrado en catálogo');

    // Actualizar estado de la solicitud
    await client.query(
      `UPDATE solicitud_cambio SET id_estado_sol = $1 WHERE id_solicitud = $2`,
      [nuevoEstado, id_solicitud]
    );

    // Registrar en historial
    const { rows } = await client.query(`
      INSERT INTO historial_aprobacion (id_solicitud, id_director, id_motivo_rechazo)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [id_solicitud, id_director, aprobado ? null : id_motivo_rechazo]);

    // --- DISPARADOR DE NOTIFICACIÓN EN NODE.JS ---
    
    // 1. Obtener al usuario (docente) dueño de la solicitud
    const resultDocente = await client.query(`
      SELECT u.id_usuario 
      FROM solicitud_cambio sc
      JOIN docente d ON d.id_docente = sc.id_docente
      JOIN usuario u ON u.id_persona = d.id_persona
      WHERE sc.id_solicitud = $1
    `, [id_solicitud]);

    if (resultDocente.rows.length > 0) {
      const id_usuario_docente = resultDocente.rows[0].id_usuario;
      
      // Buscar ID del tipo de notificación ("Aprobación" o "Rechazo")
      const nombre_notif = aprobado ? 'Aprobacion Solicitud' : 'Rechazo Solicitud';
      const resultTipoNotif = await client.query(`
        SELECT id_tipo_notif FROM tipo_notificacion WHERE nombre_tipo = $1
      `, [nombre_notif]);
      
      // Aseguramos que existe el tipo
      const id_tipo_notif = resultTipoNotif.rows.length > 0 ? resultTipoNotif.rows[0].id_tipo_notif : 1;

      // Registrar la notificación general
      const regNotifResult = await client.query(`
        INSERT INTO registro_notificacion (id_tipo_notif) 
        VALUES ($1) RETURNING id_registro_notif
      `, [id_tipo_notif]);
      const id_registro_notif = regNotifResult.rows[0].id_registro_notif;

      // Buscar el ID del estado de notificación "Pendiente" (para que el Cron lo lea)
      const resultEstadoNotif = await client.query(`
        SELECT id_estado_notif FROM estado_notificacion WHERE nombre_estado = 'Pendiente'
      `);
      const id_estado_notif = resultEstadoNotif.rows.length > 0 ? resultEstadoNotif.rows[0].id_estado_notif : 1;

      // Enlazar al destinatario
      await client.query(`
        INSERT INTO destinatario_notificacion 
        (id_registro_notif, id_usuario, id_estado_notif)
        VALUES ($1, $2, $3)
      `, [id_registro_notif, id_usuario_docente, id_estado_notif]);
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    const conflict = parseConstraintError(err);
    if (conflict) {
      const error = new Error(conflict.userMessage);
      error.status = error.statusCode = conflict.httpStatus;
      error.conflictCode = conflict.code;
      error.triggerMessage = conflict.triggerMessage;
      throw error;
    }
    throw err;
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════
// EXCEPCIÓN DE HORARIO
// ═══════════════════════════════════════════

async function crearExcepcion({ id_horario, id_motivo_excep, fecha_exacta }) {
  const { rows } = await db.query(`
    INSERT INTO excepcion_horario (id_horario, id_motivo_excep, fecha_exacta)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [id_horario, id_motivo_excep, fecha_exacta]);
  return rows[0];
}

async function getExcepcionesByPeriodo(idPeriodo) {
  const { rows } = await db.query(`
    SELECT ex.id_excepcion, ex.fecha_exacta,
           me.descripcion AS motivo,
           m.nombre_materia, gm.nombre_grupo,
           a.nombre_codigo AS aula,
           ds.nombre_dia, bh.hora_inicio, bh.hora_fin
    FROM excepcion_horario ex
    JOIN motivo_excepcion me ON ex.id_motivo_excep = me.id_motivo_excep
    JOIN horario_clase hc ON ex.id_horario = hc.id_horario
    JOIN grupo_materia gm ON hc.id_grupo = gm.id_grupo
    JOIN materia_plan mp ON gm.id_mat_plan = mp.id_mat_plan
    JOIN materia m ON mp.id_materia = m.id_materia
    JOIN aula a ON hc.id_aula = a.id_aula
    JOIN dia_semana ds ON hc.id_dia = ds.id_dia
    JOIN bloque_horario bh ON hc.id_bloque = bh.id_bloque
    WHERE gm.id_periodo = $1
    ORDER BY ex.fecha_exacta
  `, [idPeriodo]);
  return rows;
}

// ═══════════════════════════════════════════
// FERIADOS
// ═══════════════════════════════════════════

async function getFeriadosByPeriodo(idPeriodo) {
  const { rows } = await db.query(`
    SELECT id_feriado, fecha_feriado, descripcion
    FROM feriado
    WHERE id_periodo = $1
    ORDER BY fecha_feriado
  `, [idPeriodo]);
  return rows;
}

async function crearFeriado({ id_periodo, fecha_feriado, descripcion }) {
  const { rows } = await db.query(`
    INSERT INTO feriado (id_periodo, fecha_feriado, descripcion)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [id_periodo, fecha_feriado, descripcion]);
  return rows[0];
}

// ═══════════════════════════════════════════
// CATÁLOGOS
// ═══════════════════════════════════════════

async function getAllTiposSolicitud() {
  const { rows } = await db.query(`SELECT * FROM tipo_solicitud ORDER BY nombre_tipo`);
  return rows;
}

async function getAllEstadosSolicitud() {
  const { rows } = await db.query(`SELECT * FROM estado_solicitud ORDER BY nombre_estado`);
  return rows;
}

async function getAllMotivosRechazo() {
  const { rows } = await db.query(`SELECT * FROM motivo_rechazo ORDER BY descripcion`);
  return rows;
}

async function getAllMotivosExcepcion() {
  const { rows } = await db.query(`SELECT * FROM motivo_excepcion ORDER BY descripcion`);
  return rows;
}

module.exports = {
  crearSolicitud, getSolicitudesByDocente, getSolicitudesPendientes, resolverSolicitud,
  crearExcepcion, getExcepcionesByPeriodo,
  getFeriadosByPeriodo, crearFeriado,
  getAllTiposSolicitud, getAllEstadosSolicitud, getAllMotivosRechazo, getAllMotivosExcepcion
};
