// src/modules/academico/academico.routes.js
const express = require('express');
const router = express.Router();
router.use('/direcciones', require('./direcciones.routes'));
const { protectWrites, verifyToken, checkPermission } = require('../../middlewares/authMiddleware');

// Control de autorizaciones de escritura globales y por rol
router.use(protectWrites);
const ctrl = require('./academico.controller');

// ─── Catálogos auxiliares (lectura) ───
router.get('/areas',          verifyToken, ctrl.getAllAreasConocimiento);
router.get('/semestres',      verifyToken, ctrl.getAllSemestres);
router.get('/modalidades',    verifyToken, ctrl.getAllModalidades);
router.get('/tipos-clase',    verifyToken, ctrl.getAllTiposClase);
router.get('/estados-grupo',  verifyToken, ctrl.getAllEstadosGrupo);
router.get('/facultades',     verifyToken, ctrl.getAllFacultades);

// ─── Periodo Académico ───
router.get('/periodos',        verifyToken, ctrl.getAllPeriodos);
router.get('/periodos/activo', verifyToken, ctrl.getPeriodoActivo);
router.post('/periodos',       verifyToken, checkPermission('GESTIONAR_PERIODO'), ctrl.createPeriodo);
router.put('/periodos/:id',    verifyToken, checkPermission('GESTIONAR_PERIODO'), ctrl.updatePeriodo);

// ─── Materias y Configuración Curricular ───
const curriculum = require('./curriculum.service');
router.get('/materias/:id/configuracion', verifyToken, async (req, res, next) => {
  try { res.json(await curriculum.getConfig(req.params.id)); } catch (e) { next(e); }
});
router.post('/materias/configuracion', verifyToken, async (req, res, next) => {
  try { res.status(201).json({ materia: await curriculum.saveConfig(null, req.body) }); } catch (e) { next(e); }
});
router.put('/materias/:id/configuracion', verifyToken, async (req, res, next) => {
  try { res.json({ materia: await curriculum.saveConfig(req.params.id, req.body) }); } catch (e) { next(e); }
});

router.get('/materias',          verifyToken, ctrl.getAllMaterias);
router.get('/materias/:id',      verifyToken, ctrl.getMateriaById);
router.post('/materias',         verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.createMateria);
router.put('/materias/:id',      verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.updateMateria);
router.delete('/materias/:id',   verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.deleteMateria);

// Carga Horaria por Materia
router.get('/materias/:id/carga',  verifyToken, ctrl.getCargaHoraria);
router.put('/materias/:id/carga',  verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.updateCargaHoraria);
router.post('/materias/:id/carga', verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.updateCargaHoraria);

// ─── Carreras ───
router.get('/carreras',                    verifyToken, ctrl.getAllCarreras);
router.get('/carreras/:id',                verifyToken, ctrl.getCarreraById);
router.get('/carreras/:idCarrera/planes',  verifyToken, ctrl.getPlanesByCarrera);
router.post('/carreras',                   verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.createCarrera);
router.put('/carreras/:id',                verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.updateCarrera);
router.delete('/carreras/:id',             verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.deleteCarrera);

// ─── Planes de Estudio y Materia-Plan ───
router.get('/planes',                 verifyToken, ctrl.getAllPlanes);
router.get('/planes/:id',             verifyToken, ctrl.getPlanById);
router.post('/planes',                verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.createPlan);
router.put('/planes/:id',             verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.updatePlan);
router.delete('/planes/:id',          verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.deletePlan);

router.get('/planes/:idPlan/materias',                   verifyToken, ctrl.getMateriasByPlan);
router.post('/planes/:idPlan/materias',                  verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.vincularMateriaPlan);
router.post('/planes/:idPlan/materias-con-carga',         verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.vincularMateriaPlanConCarga);
router.post('/planes/materias-configuracion',            verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.vincularMateriaPlanConCarga);

// Gestión directa de vínculos Materia-Plan
router.get('/materia-planes/:id',                        verifyToken, ctrl.getMateriaPlanById);
router.post('/materia-planes',                           verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.vincularMateriaPlan);
router.put('/materia-planes/:id',                        verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.updateMateriaPlan);
router.delete('/materia-planes/:id',                     verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.desvincularMateriaPlan);
router.post('/materia-planes/configurar',                verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.vincularMateriaPlanConCarga);

// Prerrequisitos
router.get('/materia-planes/:idMatPlan/prerequisitos',   verifyToken, ctrl.getPrerequisitos);
router.post('/materia-planes/prerequisitos',             verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.createPrerequisito);
router.delete('/materia-planes/prerequisitos/:id',       verifyToken, checkPermission('GESTIONAR_MATERIA'), ctrl.deletePrerequisito);

// ─── Grupos y Asignación Docente ───
router.get('/grupos/periodo/:idPeriodo',                 verifyToken, ctrl.getGruposByPeriodo);
router.post('/grupos',                                   verifyToken, checkPermission('GESTIONAR_GRUPO'), ctrl.createGrupo);
router.get('/grupos/:idGrupo/docentes',                  verifyToken, ctrl.getDocentesByGrupo);
router.post('/grupos/asignar-docente',                   verifyToken, checkPermission('ASIGNAR_DOCENTE'), ctrl.asignarDocente);
router.post('/grupos/desasignar-docente',                verifyToken, checkPermission('ASIGNAR_DOCENTE'), ctrl.desasignarDocente);
router.delete('/grupos/:idGrupo/docentes/:idDocente',    verifyToken, checkPermission('ASIGNAR_DOCENTE'), ctrl.desasignarDocente);
router.delete('/grupos/asignacion-docente/:idAsigDoc',   verifyToken, checkPermission('ASIGNAR_DOCENTE'), ctrl.desasignarDocente);
router.delete('/asignaciones-docente/:idAsigDoc',        verifyToken, checkPermission('ASIGNAR_DOCENTE'), ctrl.desasignarDocente);

module.exports = router;
