function httpError(status, message) {
  const error = new Error(message);
  error.status = error.statusCode = status;
  return error;
}
function positiveId(value, name = 'Identificador') {
  if (!Number.isSafeInteger(Number(value)) || Number(value) <= 0) throw httpError(400, `${name} invalido`);
  return Number(value);
}
function assertActiveUser(userOrState, idEstadoUsr) {
  let state = userOrState;
  let idEstado = idEstadoUsr;
  if (typeof userOrState === 'object' && userOrState !== null) {
    state = userOrState.nombre_estado;
    idEstado = userOrState.id_estado_usr;
  }
  if (idEstado !== undefined && idEstado !== null && Number(idEstado) !== 1) {
    throw httpError(403, 'La cuenta de usuario está inactiva o suspendida');
  }
  if (state !== undefined && state !== null) {
    const cleanState = String(state).trim().toLowerCase();
    if (cleanState && cleanState !== 'activo') {
      throw httpError(403, 'La cuenta de usuario está inactiva o suspendida');
    }
  }
}
async function assertOperationalRoom(client, id) {
  positiveId(id, 'Aula');
  const { rows } = await client.query(`SELECT a.id_aula, e.nombre_estado FROM aula a
    JOIN estado_aula e USING(id_estado_espacio) WHERE a.id_aula=$1 FOR SHARE OF a,e`, [id]);
  if (!rows.length) throw httpError(404, 'Aula no encontrada');
  if (!['activa', 'activo', 'operativa', 'operativo', 'disponible'].includes(rows[0].nombre_estado.trim().toLowerCase())) {
    throw httpError(409, `Aula no operativa: ${rows[0].nombre_estado}`);
  }
}
module.exports = { httpError, positiveId, assertActiveUser, assertOperationalRoom };
