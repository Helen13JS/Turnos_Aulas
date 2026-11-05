const { PERIODO_ACTIVO_SQL } = require('../../utils/periodoActivo');
// src/modules/infraestructura/aula.service.js
const db = require('../../config/db');
const { httpError, positiveId } = require('../../utils/domainValidation');

/**
 * Obtiene todas las aulas con info de piso, pabellón, tipo y estado.
 */
async function getAll(filters = {}) {
  const conditions = [];
  const values = [];
  if (filters.idPabellon) {
    values.push(filters.idPabellon);
    conditions.push(`pb.id_pabellon = $${values.length}`);
  }
  if (filters.numeroPiso) {
    values.push(filters.numeroPiso);
    conditions.push(`p.numero_piso = $${values.length}`);
  }
  const query = `
    SELECT a.id_aula, a.nombre_codigo, a.capacidad_maxima,
           a.coord_x, a.coord_y,
           ta.id_tipo_espacio, ta.nombre_tipo AS tipo_aula,
           ea.id_estado_espacio, ea.nombre_estado AS estado_aula,
           p.id_piso, p.numero_piso, p.descripcion AS desc_piso,
           pb.id_pabellon, pb.nombre_pabellon,
           f.id_facultad, f.nombre_facultad
    FROM aula a
    JOIN tipo_aula    ta ON a.id_tipo_espacio   = ta.id_tipo_espacio
    JOIN estado_aula  ea ON a.id_estado_espacio = ea.id_estado_espacio
    JOIN piso          p ON a.id_piso           = p.id_piso
    JOIN pabellon     pb ON p.id_pabellon       = pb.id_pabellon
    JOIN facultad      f ON pb.id_facultad      = f.id_facultad
    ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
    ORDER BY pb.nombre_pabellon, p.numero_piso, a.nombre_codigo
  `;
  const { rows } = await db.query(query, values);
  return rows;
}

/**
 * Obtiene un aula por su ID con toda la info relacionada.
 */
async function getById(id) {
  positiveId(id, 'Aula');
  const query = `
    SELECT a.id_aula, a.nombre_codigo, a.capacidad_maxima,
           a.coord_x, a.coord_y,
           a.id_piso, a.id_tipo_espacio, a.id_estado_espacio,
           ta.nombre_tipo   AS tipo_aula,
           ea.nombre_estado AS estado_aula,
           p.numero_piso, p.descripcion AS desc_piso,
           pb.nombre_pabellon, pb.id_pabellon,
           f.id_facultad, f.nombre_facultad
    FROM aula a
    JOIN tipo_aula    ta ON a.id_tipo_espacio   = ta.id_tipo_espacio
    JOIN estado_aula  ea ON a.id_estado_espacio = ea.id_estado_espacio
    JOIN piso          p ON a.id_piso           = p.id_piso
    JOIN pabellon     pb ON p.id_pabellon       = pb.id_pabellon
    JOIN facultad      f ON pb.id_facultad      = f.id_facultad
    WHERE a.id_aula = $1
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0] || null;
}

/**
 * Obtiene aulas filtradas por pabellón.
 */
async function getByPabellon(idPabellon) {
  positiveId(idPabellon, 'Pabellón');
  const query = `
    SELECT a.id_aula, a.nombre_codigo, a.capacidad_maxima,
           ta.nombre_tipo AS tipo_aula,
           ea.nombre_estado AS estado_aula,
           p.id_piso, p.numero_piso
    FROM aula a
    JOIN tipo_aula    ta ON a.id_tipo_espacio   = ta.id_tipo_espacio
    JOIN estado_aula  ea ON a.id_estado_espacio = ea.id_estado_espacio
    JOIN piso          p ON a.id_piso           = p.id_piso
    WHERE p.id_pabellon = $1
    ORDER BY p.numero_piso, a.nombre_codigo
  `;
  const { rows } = await db.query(query, [idPabellon]);
  return rows;
}

/**
 * Catálogos auxiliares
 */
async function getTiposAula() {
  const { rows } = await db.query('SELECT id_tipo_espacio, nombre_tipo FROM tipo_aula ORDER BY nombre_tipo');
  return rows;
}

async function getEstadosAula() {
  const { rows } = await db.query('SELECT id_estado_espacio, nombre_estado FROM estado_aula ORDER BY id_estado_espacio');
  return rows;
}

async function getAllFacultades() {
  const { rows } = await db.query(`
    SELECT f.id_facultad, f.nombre_facultad, c.nombre_campus, i.nombre AS institucion
    FROM facultad f
    JOIN campus c ON f.id_campus = c.id_campus
    JOIN institucion i ON c.id_institucion = i.id_institucion
    ORDER BY f.nombre_facultad
  `);
  return rows;
}

/**
 * CRUD Pabellón
 */
async function getAllPabellones() {
  const query = `
    SELECT pb.id_pabellon, pb.nombre_pabellon, pb.id_facultad,
           f.nombre_facultad, c.nombre_campus
    FROM pabellon pb
    JOIN facultad f ON pb.id_facultad = f.id_facultad
    JOIN campus c ON f.id_campus = c.id_campus
    ORDER BY f.nombre_facultad, pb.nombre_pabellon
  `;
  const { rows } = await db.query(query);
  return rows;
}

async function getPabellonById(id) {
  positiveId(id, 'Pabellón');
  const query = `
    SELECT pb.id_pabellon, pb.nombre_pabellon, pb.id_facultad,
           f.nombre_facultad, c.nombre_campus
    FROM pabellon pb
    JOIN facultad f ON pb.id_facultad = f.id_facultad
    JOIN campus c ON f.id_campus = c.id_campus
    WHERE pb.id_pabellon = $1
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0] || null;
}

async function createPabellon({ id_facultad, nombre_pabellon }) {
  positiveId(id_facultad, 'Facultad');
  if (typeof nombre_pabellon !== 'string' || !nombre_pabellon.trim()) {
    throw httpError(400, 'El nombre del pabellón es obligatorio');
  }

  const fac = await db.query('SELECT 1 FROM facultad WHERE id_facultad = $1', [id_facultad]);
  if (!fac.rowCount) throw httpError(404, 'La facultad especificada no existe');

  const { rows } = await db.query(`
    INSERT INTO pabellon (id_facultad, nombre_pabellon)
    VALUES ($1, $2)
    RETURNING *
  `, [id_facultad, nombre_pabellon.trim()]);
  return await getPabellonById(rows[0].id_pabellon);
}

async function updatePabellon(id, { id_facultad, nombre_pabellon }) {
  positiveId(id, 'Pabellón');
  const existing = await getPabellonById(id);
  if (!existing) throw httpError(404, 'Pabellón no encontrado');

  if (id_facultad != null) {
    positiveId(id_facultad, 'Facultad');
    const fac = await db.query('SELECT 1 FROM facultad WHERE id_facultad = $1', [id_facultad]);
    if (!fac.rowCount) throw httpError(404, 'La facultad especificada no existe');
  }

  const nombreFinal = (nombre_pabellon && typeof nombre_pabellon === 'string') ? nombre_pabellon.trim() : null;

  await db.query(`
    UPDATE pabellon SET
      id_facultad = COALESCE($1, id_facultad),
      nombre_pabellon = COALESCE($2, nombre_pabellon)
    WHERE id_pabellon = $3
  `, [id_facultad || null, nombreFinal, id]);

  return await getPabellonById(id);
}

async function deletePabellon(id) {
  positiveId(id, 'Pabellón');
  const pabellon = await getPabellonById(id);
  if (!pabellon) throw httpError(404, 'Pabellón no encontrado');

  const aulasCheck = await db.query(`
    SELECT COUNT(a.id_aula) AS count
    FROM piso p
    JOIN aula a ON a.id_piso = p.id_piso
    WHERE p.id_pabellon = $1
  `, [id]);

  if (parseInt(aulasCheck.rows[0].count) > 0) {
    throw httpError(409, `No se puede eliminar el pabellón: contiene ${aulasCheck.rows[0].count} aula(s) registrada(s). Elimine o traslade las aulas primero.`);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM piso WHERE id_pabellon = $1', [id]);
    await client.query('DELETE FROM pabellon WHERE id_pabellon = $1', [id]);
    await client.query('COMMIT');
    return { eliminada: true, message: 'Pabellón eliminado exitosamente.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * CRUD Piso
 */
async function getPisosByPabellon(idPabellon) {
  positiveId(idPabellon, 'Pabellón');
  const query = `
    SELECT id_piso, id_pabellon, numero_piso, descripcion
    FROM piso
    WHERE id_pabellon = $1
    ORDER BY numero_piso
  `;
  const { rows } = await db.query(query, [idPabellon]);
  return rows;
}

async function getPisoById(id) {
  positiveId(id, 'Piso');
  const query = `
    SELECT p.id_piso, p.id_pabellon, p.numero_piso, p.descripcion,
           pb.nombre_pabellon
    FROM piso p
    JOIN pabellon pb ON p.id_pabellon = pb.id_pabellon
    WHERE p.id_piso = $1
  `;
  const { rows } = await db.query(query, [id]);
  return rows[0] || null;
}

async function createPiso({ id_pabellon, numero_piso, descripcion }) {
  positiveId(id_pabellon, 'Pabellón');
  const num = Number(numero_piso);
  if (!Number.isSafeInteger(num)) {
    throw httpError(400, 'El número de piso debe ser un entero');
  }

  const pab = await db.query('SELECT 1 FROM pabellon WHERE id_pabellon = $1', [id_pabellon]);
  if (!pab.rowCount) throw httpError(404, 'El pabellón especificado no existe');

  const dup = await db.query('SELECT 1 FROM piso WHERE id_pabellon = $1 AND numero_piso = $2', [id_pabellon, num]);
  if (dup.rowCount > 0) throw httpError(409, `El piso ${num} ya existe en este pabellón`);

  const descFinal = descripcion && typeof descripcion === 'string' && descripcion.trim() ? descripcion.trim() : `Piso ${num}`;

  const { rows } = await db.query(`
    INSERT INTO piso (id_pabellon, numero_piso, descripcion)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [id_pabellon, num, descFinal]);
  return rows[0];
}

async function updatePiso(id, { id_pabellon, numero_piso, descripcion }) {
  positiveId(id, 'Piso');
  const existing = await getPisoById(id);
  if (!existing) throw httpError(404, 'Piso no encontrado');

  const targetPabellon = id_pabellon != null ? positiveId(id_pabellon, 'Pabellón') : existing.id_pabellon;
  const targetNum = numero_piso != null ? Number(numero_piso) : existing.numero_piso;

  if (numero_piso != null && !Number.isSafeInteger(targetNum)) {
    throw httpError(400, 'El número de piso debe ser un entero');
  }

  if (targetPabellon !== existing.id_pabellon || targetNum !== existing.numero_piso) {
    const dup = await db.query('SELECT 1 FROM piso WHERE id_pabellon = $1 AND numero_piso = $2 AND id_piso <> $3', [targetPabellon, targetNum, id]);
    if (dup.rowCount > 0) throw httpError(409, `El piso ${targetNum} ya existe en el pabellón seleccionado`);
  }

  const descFinal = (descripcion != null && typeof descripcion === 'string') ? descripcion.trim() : null;

  const { rows } = await db.query(`
    UPDATE piso SET
      id_pabellon = COALESCE($1, id_pabellon),
      numero_piso = COALESCE($2, numero_piso),
      descripcion = COALESCE($3, descripcion)
    WHERE id_piso = $4
    RETURNING *
  `, [id_pabellon || null, numero_piso != null ? targetNum : null, descFinal, id]);
  return rows[0];
}

async function deletePiso(id) {
  positiveId(id, 'Piso');
  const piso = await getPisoById(id);
  if (!piso) throw httpError(404, 'Piso no encontrado');

  const aulasCount = await db.query('SELECT COUNT(*) FROM aula WHERE id_piso = $1', [id]);
  if (parseInt(aulasCount.rows[0].count) > 0) {
    throw httpError(409, `No se puede eliminar el piso: contiene ${aulasCount.rows[0].count} aula(s) registrada(s). Elimine o traslade las aulas primero.`);
  }

  await db.query('DELETE FROM piso WHERE id_piso = $1', [id]);
  return { eliminada: true, message: 'Piso eliminado exitosamente.' };
}

/**
 * CRUD Aula
 */
async function createAula({ id_piso, id_tipo_espacio, id_estado_espacio, nombre_codigo, capacidad_maxima, coord_x, coord_y }) {
  positiveId(id_piso, 'Piso');
  positiveId(id_tipo_espacio, 'Tipo de espacio');
  positiveId(id_estado_espacio, 'Estado de espacio');

  if (typeof nombre_codigo !== 'string' || !nombre_codigo.trim()) {
    throw httpError(400, 'El nombre o código del aula es obligatorio');
  }
  const cap = Number(capacidad_maxima);
  if (!Number.isSafeInteger(cap) || cap <= 0) {
    throw httpError(400, 'La capacidad máxima debe ser un número entero mayor a 0');
  }

  const piso = await db.query('SELECT 1 FROM piso WHERE id_piso = $1', [id_piso]);
  if (!piso.rowCount) throw httpError(404, 'El piso especificado no existe');

  const tipo = await db.query('SELECT 1 FROM tipo_aula WHERE id_tipo_espacio = $1', [id_tipo_espacio]);
  if (!tipo.rowCount) throw httpError(404, 'El tipo de espacio especificado no existe');

  const estado = await db.query('SELECT 1 FROM estado_aula WHERE id_estado_espacio = $1', [id_estado_espacio]);
  if (!estado.rowCount) throw httpError(404, 'El estado de espacio especificado no existe');

  const existing = await db.query('SELECT id_aula FROM aula WHERE lower(nombre_codigo) = lower($1)', [nombre_codigo.trim()]);
  if (existing.rowCount > 0) {
    throw httpError(409, `El código de aula "${nombre_codigo.trim()}" ya está registrado`);
  }

  const { rows } = await db.query(`
    INSERT INTO aula (id_piso, id_tipo_espacio, id_estado_espacio, nombre_codigo, capacidad_maxima, coord_x, coord_y)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id_aula
  `, [
    id_piso,
    id_tipo_espacio,
    id_estado_espacio,
    nombre_codigo.trim(),
    cap,
    coord_x != null && !isNaN(Number(coord_x)) ? Number(coord_x) : null,
    coord_y != null && !isNaN(Number(coord_y)) ? Number(coord_y) : null,
  ]);

  return await getById(rows[0].id_aula);
}

async function updateAula(id, data) {
  positiveId(id, 'Aula');
  const existing = await getById(id);
  if (!existing) throw httpError(404, 'Aula no encontrada');

  const id_piso = data.id_piso != null ? positiveId(data.id_piso, 'Piso') : undefined;
  const id_tipo_espacio = data.id_tipo_espacio != null ? positiveId(data.id_tipo_espacio, 'Tipo de espacio') : undefined;
  const id_estado_espacio = data.id_estado_espacio != null ? positiveId(data.id_estado_espacio, 'Estado de espacio') : undefined;

  let nombre_codigo = data.nombre_codigo;
  if (nombre_codigo != null) {
    if (typeof nombre_codigo !== 'string' || !nombre_codigo.trim()) {
      throw httpError(400, 'El nombre o código del aula no puede estar vacío');
    }
    nombre_codigo = nombre_codigo.trim();
    const dup = await db.query('SELECT id_aula FROM aula WHERE lower(nombre_codigo) = lower($1) AND id_aula <> $2', [nombre_codigo, id]);
    if (dup.rowCount > 0) throw httpError(409, `El código de aula "${nombre_codigo}" ya está en uso por otra aula`);
  }

  let cap = undefined;
  if (data.capacidad_maxima != null) {
    cap = Number(data.capacidad_maxima);
    if (!Number.isSafeInteger(cap) || cap <= 0) {
      throw httpError(400, 'La capacidad máxima debe ser un número entero mayor a 0');
    }
  }

  if (id_piso) {
    const piso = await db.query('SELECT 1 FROM piso WHERE id_piso = $1', [id_piso]);
    if (!piso.rowCount) throw httpError(404, 'El piso especificado no existe');
  }
  if (id_tipo_espacio) {
    const tipo = await db.query('SELECT 1 FROM tipo_aula WHERE id_tipo_espacio = $1', [id_tipo_espacio]);
    if (!tipo.rowCount) throw httpError(404, 'El tipo de espacio especificado no existe');
  }
  if (id_estado_espacio) {
    const estado = await db.query('SELECT 1 FROM estado_aula WHERE id_estado_espacio = $1', [id_estado_espacio]);
    if (!estado.rowCount) throw httpError(404, 'El estado de espacio especificado no existe');
  }

  await db.query(`
    UPDATE aula SET
      id_piso = COALESCE($1, id_piso),
      id_tipo_espacio = COALESCE($2, id_tipo_espacio),
      id_estado_espacio = COALESCE($3, id_estado_espacio),
      nombre_codigo = COALESCE($4, nombre_codigo),
      capacidad_maxima = COALESCE($5, capacidad_maxima),
      coord_x = CASE WHEN $6::numeric IS NOT NULL THEN $6::numeric ELSE coord_x END,
      coord_y = CASE WHEN $7::numeric IS NOT NULL THEN $7::numeric ELSE coord_y END
    WHERE id_aula = $8
  `, [
    id_piso || null,
    id_tipo_espacio || null,
    id_estado_espacio || null,
    nombre_codigo || null,
    cap || null,
    data.coord_x != null && !isNaN(Number(data.coord_x)) ? Number(data.coord_x) : null,
    data.coord_y != null && !isNaN(Number(data.coord_y)) ? Number(data.coord_y) : null,
    id,
  ]);

  return await getById(id);
}

async function deleteAula(id, inhabilitar = false) {
  positiveId(id, 'Aula');
  const aula = await getById(id);
  if (!aula) throw httpError(404, 'Aula no encontrada');

  const [clasesRes, reservasRes, solicitudesRes] = await Promise.all([
    db.query('SELECT COUNT(*) FROM horario_clase WHERE id_aula = $1', [id]),
    db.query('SELECT COUNT(*) FROM reserva_temporal WHERE id_aula = $1', [id]),
    db.query('SELECT COUNT(*) FROM solicitud_cambio WHERE aula_solicitada = $1', [id]),
  ]);

  const hasActivity = (
    parseInt(clasesRes.rows[0].count) > 0 ||
    parseInt(reservasRes.rows[0].count) > 0 ||
    parseInt(solicitudesRes.rows[0].count) > 0
  );

  if (inhabilitar || hasActivity) {
    const { rows: estados } = await db.query(`
      SELECT id_estado_espacio, nombre_estado FROM estado_aula
      WHERE lower(nombre_estado) LIKE '%mantenimiento%' OR lower(nombre_estado) LIKE '%inactiv%'
      ORDER BY id_estado_espacio LIMIT 1
    `);
    const idEstadoInhabilitado = estados[0]?.id_estado_espacio || aula.id_estado_espacio;
    await db.query('UPDATE aula SET id_estado_espacio = $1 WHERE id_aula = $2', [idEstadoInhabilitado, id]);
    const updated = await getById(id);
    return {
      inhabilitada: true,
      eliminada: false,
      message: hasActivity
        ? `El aula tiene registros académicos asociados (${clasesRes.rows[0].count} clases, ${reservasRes.rows[0].count} reservas). Ha sido inhabilitada (puesta En mantenimiento) para conservar la trazabilidad histórica.`
        : 'Aula inhabilitada correctamente.',
      aula: updated,
    };
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM recurso_aula WHERE id_aula = $1', [id]);
    await client.query('DELETE FROM aula_carrera WHERE id_aula = $1', [id]);
    await client.query('DELETE FROM aula WHERE id_aula = $1', [id]);
    await client.query('COMMIT');
    return {
      inhabilitada: false,
      eliminada: true,
      message: 'Aula eliminada exitosamente del sistema.',
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Obtiene las carreras que comparten un aula (aula_carrera).
 */
async function getCarrerasByAula(idAula) {
  positiveId(idAula, 'Aula');
  const query = `
    SELECT ac.id_aula_carrera, ac.es_compartida,
           dc.id_carrera, dc.nombre_carrera, dc.sigla
    FROM aula_carrera ac
    JOIN direccion_carrera dc ON ac.id_carrera = dc.id_carrera
    WHERE ac.id_aula = $1
  `;
  const { rows } = await db.query(query, [idAula]);
  return rows;
}

/**
 * Obtiene recursos asignados a un aula.
 */
async function getRecursosByAula(idAula) {
  positiveId(idAula, 'Aula');
  const query = `
    SELECT ra.id_rec_aula, ra.fecha_asignacion,
           r.id_recurso, r.nro_serie, r.descripcion,
           tr.nombre_tipo AS tipo_recurso, tr.id_tipo_recurso
    FROM recurso_aula ra
    JOIN recurso       r  ON ra.id_recurso      = r.id_recurso
    JOIN tipo_recurso  tr ON r.id_tipo_recurso   = tr.id_tipo_recurso
    WHERE ra.id_aula = $1
    ORDER BY ra.fecha_asignacion DESC, r.descripcion
  `;
  const { rows } = await db.query(query, [idAula]);
  return rows;
}

async function getDisponibles({ dia, bloque, periodo }) {
  const values = [dia, bloque];
  const periodoSql = periodo ? '$3' : '(SELECT id_periodo FROM (' + PERIODO_ACTIVO_SQL + ') periodo_activo)';
  if (periodo) values.push(periodo);
  const { rows } = await db.query(`
    SELECT a.id_aula, a.nombre_codigo, a.capacidad_maxima,
           ta.nombre_tipo AS tipo_aula, ea.nombre_estado AS estado_aula,
           pb.id_pabellon, pb.nombre_pabellon, p.id_piso, p.numero_piso, f.nombre_facultad,
           lower(trim(ea.nombre_estado)) NOT IN ('activa','activo','operativa','operativo','disponible') AS no_disponible,
           (json_array_length(COALESCE(ocupacion.clases, '[]'::json)) + json_array_length(COALESCE(reservas.items, '[]'::json))) > 0 AS ocupada,
           COALESCE(ocupacion.clases, '[]'::json) AS clases,
           COALESCE(reservas.items, '[]'::json) AS reservas
    FROM aula a
    JOIN tipo_aula ta ON a.id_tipo_espacio = ta.id_tipo_espacio
    JOIN estado_aula ea ON a.id_estado_espacio = ea.id_estado_espacio
    JOIN piso p ON a.id_piso = p.id_piso
    JOIN pabellon pb ON p.id_pabellon = pb.id_pabellon
    JOIN facultad f ON f.id_facultad = pb.id_facultad
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object(
        'id_horario', hc.id_horario, 'id_grupo', gm.id_grupo,
        'nombre_grupo', gm.nombre_grupo, 'nombre_materia', m.nombre_materia,
        'sigla_materia', m.sigla, 'tipo_clase', tc.nombre_tipo,
        'id_aula', a.id_aula, 'aula', a.nombre_codigo,
        'docentes', COALESCE((SELECT json_agg(json_build_object(
          'id_docente', d.id_docente, 'nombre_docente', per.nombres || ' ' || per.apellidos
        ) ORDER BY d.id_docente)
          FROM asignacion_docente ad JOIN docente d USING (id_docente)
          JOIN persona per ON per.id_persona = d.id_persona
          WHERE ad.id_grupo = gm.id_grupo), '[]'::json)
      ) ORDER BY hc.id_horario) AS clases
      FROM horario_clase hc JOIN grupo_materia gm USING (id_grupo)
      JOIN materia_plan mp USING (id_mat_plan) JOIN materia m USING (id_materia)
      JOIN tipo_clase tc USING (id_tipo_clase)
      JOIN bloque_horario actual ON actual.id_bloque=hc.id_bloque
      JOIN bloque_horario elegido ON elegido.id_bloque=$2
      WHERE hc.id_aula = a.id_aula AND hc.id_dia = $1
        AND actual.hora_inicio<elegido.hora_fin AND elegido.hora_inicio<actual.hora_fin
        AND gm.id_periodo = ${periodoSql}
    ) ocupacion ON TRUE
    LEFT JOIN LATERAL (
      SELECT json_agg(json_build_object('id_reserva',r.id_reserva,'tipo_ocupacion','reserva',
        'fecha_reserva',r.fecha_reserva::text,'motivo',r.motivo,'aula',a.nombre_codigo) ORDER BY r.fecha_reserva,r.id_reserva) AS items
      FROM reserva_temporal r JOIN bloque_horario actual ON actual.id_bloque=r.id_bloque
      JOIN bloque_horario elegido ON elegido.id_bloque=$2
      WHERE r.id_aula=a.id_aula AND r.id_dia=$1 AND r.id_periodo=${periodoSql}
        AND actual.hora_inicio<elegido.hora_fin AND elegido.hora_inicio<actual.hora_fin
    ) reservas ON TRUE
    ORDER BY pb.nombre_pabellon, p.numero_piso, a.nombre_codigo
  `, values);
  return rows.map(row => ({ ...row, ocupaciones: [...row.clases, ...row.reservas] }));
}

async function getTiposRecurso() {
  return (await db.query('SELECT * FROM tipo_recurso ORDER BY nombre_tipo')).rows;
}

async function addRecurso(idAula, { id_tipo_recurso, descripcion, nro_serie }) {
  positiveId(idAula, 'Aula');
  positiveId(id_tipo_recurso, 'Tipo de recurso');
  if (typeof descripcion !== 'string' || !descripcion.trim()) throw httpError(400, 'Descripción obligatoria');

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO recurso (id_tipo_recurso, descripcion, nro_serie)
      VALUES ($1, $2, $3) RETURNING id_recurso
    `, [id_tipo_recurso, descripcion.trim(), nro_serie?.trim() || null]);
    const result = await client.query(`
      INSERT INTO recurso_aula (id_aula, id_recurso)
      VALUES ($1, $2) RETURNING *
    `, [idAula, rows[0].id_recurso]);
    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally { client.release(); }
}

async function removeRecurso(idAula, idRecAula) {
  positiveId(idAula, 'Aula');
  positiveId(idRecAula, 'Recurso de aula');
  return (await db.query('DELETE FROM recurso_aula WHERE id_aula = $1 AND id_rec_aula = $2', [idAula, idRecAula])).rowCount > 0;
}

module.exports = {
  getAll, getById, getByPabellon,
  getTiposAula, getEstadosAula, getAllFacultades,
  getAllPabellones, getPabellonById, createPabellon, updatePabellon, deletePabellon,
  getPisosByPabellon, getPisoById, createPiso, updatePiso, deletePiso,
  createAula, updateAula, deleteAula,
  getCarrerasByAula, getRecursosByAula, getDisponibles,
  getTiposRecurso, addRecurso, removeRecurso
};
