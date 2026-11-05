const db = require('../config/db');
const { ROLE_SUPER_ADMIN } = require('../utils/roles');

const GROUP_CAREER = `SELECT pe.id_carrera FROM grupo_materia gm JOIN materia_plan mp USING(id_mat_plan)
  JOIN plan_estudio pe USING(id_plan) WHERE gm.id_grupo=$1`;
const SCHEDULE_CAREER = `SELECT pe.id_carrera FROM horario_clase h JOIN grupo_materia gm USING(id_grupo)
  JOIN materia_plan mp USING(id_mat_plan) JOIN plan_estudio pe USING(id_plan) WHERE h.id_horario=$1`;
const ASSIGNMENT_CAREER = `SELECT pe.id_carrera FROM asignacion_docente ad JOIN grupo_materia gm USING(id_grupo)
  JOIN materia_plan mp USING(id_mat_plan) JOIN plan_estudio pe USING(id_plan) WHERE ad.id_asig_doc=$1`;
const MAT_PLAN_CAREER = `SELECT pe.id_carrera FROM materia_plan mp JOIN plan_estudio pe USING(id_plan) WHERE mp.id_mat_plan=$1`;
const PLAN_CAREER = `SELECT id_carrera FROM plan_estudio WHERE id_plan=$1`;
const MATERIA_CAREER = `SELECT pe.id_carrera FROM materia_plan mp JOIN plan_estudio pe USING(id_plan) WHERE mp.id_materia=$1 LIMIT 1`;

function forbidden(message = 'Esta operación no pertenece a la Dirección del Director') {
  const error = new Error(message); error.status = 403; return error;
}

async function assertCareer(user, query, id) {
  if (!Number.isSafeInteger(Number(id)) || Number(id) <= 0) {
    const error = new Error('Identificador obligatorio inválido'); error.status = 400; throw error;
  }
  const { rows } = await db.query(query, [Number(id)]);
  if (!rows.length) { const error = new Error('Registro no encontrado'); error.status = 404; throw error; }
  const allowed = rows[0].id_direccion != null ? Number(rows[0].id_direccion) === Number(user.id_direccion) :
    (await db.query('SELECT 1 FROM direccion_carrera WHERE id_carrera=$1 AND id_direccion=$2', [rows[0].id_carrera, user.id_direccion])).rowCount > 0;
  if (!allowed) throw forbidden();
}

function assertDirectorIdentity(req) {
  if (!req.user.id_director || (req.body.id_director != null && Number(req.body.id_director) !== Number(req.user.id_director))) {
    throw forbidden('El Director no puede actuar con la identidad de otro director');
  }
  req.body.id_director = req.user.id_director;
}

// Denegación por defecto: solo los flujos explícitos pueden escribir como Director.
async function authorizeCareerWrites(req, res, next) {
  if (req.user.rol === ROLE_SUPER_ADMIN) return next();
  try {
    if (!req.user.id_direccion) throw forbidden('El Director no tiene una Dirección asignada');
    const module = req.baseUrl.split('/').pop();
    const segments = req.path.split('/').filter(Boolean);
    const [resource, id] = segments;

    if (module === 'horarios' && resource === 'clase') {
      if (id === 'lote') {
        const items = req.method === 'POST' ? req.body.horarios : req.body.ids;
        if (!['POST','DELETE'].includes(req.method) || !Array.isArray(items) || !items.length || items.length > 100) {
          const err = new Error('Lote invalido'); err.status = 400; throw err;
        }
        for (const item of items) await assertCareer(req.user, req.method === 'POST' ? GROUP_CAREER : SCHEDULE_CAREER, req.method === 'POST' ? item.id_grupo : item);
      } else if (req.method === 'POST') {
        await assertCareer(req.user, GROUP_CAREER, req.body.id_grupo);
      } else if (['PUT', 'DELETE'].includes(req.method)) {
        await assertCareer(req.user, SCHEDULE_CAREER, id);
        // Comprobar también el destino impide mover horarios entre direcciones.
        if (req.method === 'PUT') await assertCareer(req.user, GROUP_CAREER, req.body.id_grupo);
      } else throw forbidden();
    } else if (module === 'academico' && resource === 'grupos') {
      if (req.method === 'POST') {
        if (['asignar-docente', 'desasignar-docente'].includes(id)) {
          await assertCareer(req.user, GROUP_CAREER, req.body.id_grupo);
        } else if (!id) {
          await assertCareer(req.user, 'SELECT pe.id_carrera FROM materia_plan mp JOIN plan_estudio pe USING(id_plan) WHERE mp.id_mat_plan=$1', req.body.id_mat_plan);
        } else throw forbidden();
      } else if (req.method === 'DELETE') {
        if (id === 'asignacion-docente' && segments[2]) {
          await assertCareer(req.user, ASSIGNMENT_CAREER, segments[2]);
        } else if (id) {
          // /grupos/:idGrupo/docentes/:idDocente
          await assertCareer(req.user, GROUP_CAREER, id);
        } else throw forbidden();
      } else throw forbidden();
    } else if (module === 'academico' && resource === 'asignaciones-docente' && req.method === 'DELETE') {
      await assertCareer(req.user, ASSIGNMENT_CAREER, id);
    } else if (module === 'academico' && resource === 'materia-planes') {
      if (req.method === 'POST') {
        await assertCareer(req.user, PLAN_CAREER, req.body.id_plan);
      } else if (['PUT', 'DELETE'].includes(req.method)) {
        await assertCareer(req.user, MAT_PLAN_CAREER, id);
      } else throw forbidden();
    } else if (module === 'academico' && resource === 'planes' && req.method === 'POST') {
      if (['materias', 'materias-con-carga'].includes(segments[2])) {
        await assertCareer(req.user, PLAN_CAREER, id);
      } else if (id === 'materias-configuracion') {
        await assertCareer(req.user, PLAN_CAREER, req.body.id_plan);
      } else throw forbidden();
    } else if (module === 'academico' && resource === 'materias' && ['PUT', 'POST'].includes(req.method) && segments[2] === 'carga') {
      await assertCareer(req.user, MATERIA_CAREER, id);
    } else if (module === 'horarios' && resource === 'reserva') {
      if (req.method === 'POST') assertDirectorIdentity(req);
      else if (req.method === 'DELETE') await assertCareer(req.user, 'SELECT d.id_direccion FROM reserva_temporal r JOIN director_carrera d USING(id_director) WHERE r.id_reserva=$1', id);
      else throw forbidden();
    } else if (module === 'solicitudes' && resource === 'cambio' && req.method === 'POST') {
      if (id === 'resolver') {
        await assertCareer(req.user, `SELECT pe.id_carrera FROM solicitud_cambio s JOIN horario_clase h USING(id_horario)
          JOIN grupo_materia gm USING(id_grupo) JOIN materia_plan mp USING(id_mat_plan) JOIN plan_estudio pe USING(id_plan) WHERE s.id_solicitud=$1`, req.body.id_solicitud);
        assertDirectorIdentity(req);
      } else if (!id) await assertCareer(req.user, SCHEDULE_CAREER, req.body.id_horario);
      else throw forbidden();
    } else if (module === 'solicitudes' && resource === 'excepciones' && req.method === 'POST') {
      await assertCareer(req.user, SCHEDULE_CAREER, req.body.id_horario);
    } else if (module === 'infraestructura' && resource === 'aulas' && req.method === 'PUT') {
      // Permitir reporte de fallas y actualización de mantenimiento en aulas
      return next();
    } else throw forbidden('Solo el Administrador General puede modificar catálogos globales, infraestructura, períodos o cuentas');
    next();
  } catch (err) { next(err); }
}

module.exports = { authorizeCareerWrites };
