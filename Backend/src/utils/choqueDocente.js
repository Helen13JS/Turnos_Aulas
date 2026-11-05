// Un docente no puede estar en dos grupos distintos en el mismo día y bloque
// (docentes distintos sí pueden coincidir en la misma hora).

/**
 * Busca clases de OTROS grupos del mismo periodo, donde el docente ya esté asignado,
 * que coincidan en día y bloque con `slots` ([{id_dia, id_bloque}]).
 * Si `slots` es null, usa las clases ya planificadas del grupo.
 */
async function buscarChoquesDocente(conn, idDocente, idGrupo, slots = null) {
  const params = [idDocente, idGrupo];
  let filtroSlots;
  if (slots) {
    params.push(JSON.stringify(slots.map(s => ({ d: Number(s.id_dia), b: Number(s.id_bloque) }))));
    filtroSlots = `(h.id_dia, h.id_bloque) IN (SELECT (x->>'d')::INT, (x->>'b')::INT FROM json_array_elements($3::json) x)`;
  } else {
    filtroSlots = `(h.id_dia, h.id_bloque) IN (SELECT id_dia, id_bloque FROM horario_clase WHERE id_grupo = $2)`;
  }
  const { rows } = await conn.query(`
    SELECT h.id_horario, h.id_grupo, ds.nombre_dia, bh.hora_inicio, bh.hora_fin,
           m.nombre_materia, gm.nombre_grupo
    FROM horario_clase h
    JOIN grupo_materia gm ON gm.id_grupo = h.id_grupo
    JOIN asignacion_docente ad ON ad.id_grupo = h.id_grupo AND ad.id_docente = $1
    JOIN materia_plan mp ON mp.id_mat_plan = gm.id_mat_plan
    JOIN materia m ON m.id_materia = mp.id_materia
    JOIN dia_semana ds ON ds.id_dia = h.id_dia
    JOIN bloque_horario bh ON bh.id_bloque = h.id_bloque
    WHERE h.id_grupo <> $2
      AND gm.id_periodo = (SELECT id_periodo FROM grupo_materia WHERE id_grupo = $2)
      AND ${filtroSlots}
    ORDER BY ds.nro_dia_iso, bh.hora_inicio
  `, params);
  return rows;
}

function errorChoqueDocente(choques) {
  const c = choques[0];
  const hora = String(c.hora_inicio).slice(0, 5);
  const error = new Error(
    `Choque de docente: ya dicta ${c.nombre_materia} (${c.nombre_grupo}) el ${c.nombre_dia} a las ${hora}.` +
    (choques.length > 1 ? ` (+${choques.length - 1} choque(s) más)` : '')
  );
  error.status = 409;
  error.conflictCode = 'CHOQUE_DOCENTE';
  error.triggerMessage = error.message;
  return error;
}

module.exports = { buscarChoquesDocente, errorChoqueDocente };
