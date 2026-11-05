// src/modules/academico/academico.controller.js
const svc = require('./academico.service');

module.exports = {
  // ─── Periodo Académico ───
  async getAllPeriodos(req, res, next) {
    try { res.json({ periodos: await svc.getAllPeriodos() }); }
    catch (err) { next(err); }
  },
  async getPeriodoActivo(req, res, next) {
    try {
      const periodo = await svc.getPeriodoActivo();
      if (!periodo) return res.status(404).json({ error: 'No hay periodo activo' });
      res.json({ periodo });
    } catch (err) { next(err); }
  },
  async createPeriodo(req, res, next) {
    try { res.status(201).json({ periodo: await svc.createPeriodo(req.body) }); }
    catch (err) { next(err); }
  },
  async updatePeriodo(req, res, next) {
    try {
      const periodo = await svc.updatePeriodo(req.params.id, req.body);
      if (!periodo) return res.status(404).json({ error: 'Periodo no encontrado' });
      res.json({ periodo });
    } catch (err) { next(err); }
  },

  // ─── Materia ───
  async getAllMaterias(req, res, next) {
    try { res.json({ materias: await svc.getAllMaterias() }); }
    catch (err) { next(err); }
  },
  async getMateriaById(req, res, next) {
    try {
      const materia = await svc.getMateriaById(req.params.id);
      if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });
      res.json({ materia });
    } catch (err) { next(err); }
  },
  async createMateria(req, res, next) {
    try { res.status(201).json({ materia: await svc.createMateria(req.body) }); }
    catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'La sigla ya existe' });
      next(err);
    }
  },
  async updateMateria(req, res, next) {
    try {
      const materia = await svc.updateMateria(req.params.id, req.body);
      if (!materia) return res.status(404).json({ error: 'Materia no encontrada' });
      res.json({ materia });
    } catch (err) { next(err); }
  },
  async deleteMateria(req, res, next) {
    try {
      const deleted = await svc.deleteMateria(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Materia no encontrada' });
      res.json({ message: 'Materia eliminada exitosamente' });
    } catch (err) { next(err); }
  },

  // ─── Carga Horaria ───
  async getCargaHoraria(req, res, next) {
    try { res.json({ carga: await svc.getCargaHoraria(req.params.id) }); }
    catch (err) { next(err); }
  },
  async updateCargaHoraria(req, res, next) {
    try {
      const cargas = req.body.cargas || req.body;
      const carga = await svc.updateCargaHoraria(req.params.id, cargas);
      res.json({ carga, message: 'Carga horaria actualizada exitosamente' });
    } catch (err) { next(err); }
  },

  // ─── Plan de Estudio ───
  async getPlanesByCarrera(req, res, next) {
    try { res.json({ planes: await svc.getPlanesByCarrera(req.params.idCarrera) }); }
    catch (err) { next(err); }
  },
  async getAllPlanes(req, res, next) {
    try { res.json({ planes: await svc.getAllPlanes() }); }
    catch (err) { next(err); }
  },
  async getPlanById(req, res, next) {
    try {
      const plan = await svc.getPlanById(req.params.id);
      if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
      res.json({ plan });
    } catch (err) { next(err); }
  },
  async createPlan(req, res, next) {
    try { res.status(201).json({ plan: await svc.createPlan(req.body) }); }
    catch (err) { next(err); }
  },
  async updatePlan(req, res, next) {
    try {
      const plan = await svc.updatePlan(req.params.id, req.body);
      if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });
      res.json({ plan });
    } catch (err) { next(err); }
  },
  async deletePlan(req, res, next) {
    try {
      const deleted = await svc.deletePlan(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Plan no encontrado' });
      res.json({ message: 'Plan eliminado exitosamente' });
    } catch (err) { next(err); }
  },

  // ─── Materia Plan ───
  async getMateriasByPlan(req, res, next) {
    try { res.json({ materias: await svc.getMateriasByPlan(req.params.idPlan) }); }
    catch (err) { next(err); }
  },
  async getMateriaPlanById(req, res, next) {
    try {
      const materiaPlan = await svc.getMateriaPlanById(req.params.id);
      if (!materiaPlan) return res.status(404).json({ error: 'Registro materia-plan no encontrado' });
      res.json({ materia_plan: materiaPlan });
    } catch (err) { next(err); }
  },
  async vincularMateriaPlan(req, res, next) {
    try {
      const payload = {
        id_materia: req.body.id_materia,
        id_plan: req.body.id_plan || req.params.idPlan,
        id_semestre: req.body.id_semestre
      };
      const materiaPlan = await svc.vincularMateriaPlan(payload);
      res.status(201).json({ materia_plan: materiaPlan, message: 'Materia vinculada al plan exitosamente' });
    } catch (err) { next(err); }
  },
  async updateMateriaPlan(req, res, next) {
    try {
      const materiaPlan = await svc.updateMateriaPlan(req.params.id, req.body);
      res.json({ materia_plan: materiaPlan, message: 'Vinculación de materia actualizada' });
    } catch (err) { next(err); }
  },
  async desvincularMateriaPlan(req, res, next) {
    try {
      await svc.desvincularMateriaPlan(req.params.id);
      res.json({ message: 'Materia desvinculada del plan exitosamente' });
    } catch (err) { next(err); }
  },
  async vincularMateriaPlanConCarga(req, res, next) {
    try {
      const payload = {
        id_materia: req.body.id_materia,
        id_plan: req.body.id_plan || req.params.idPlan,
        id_semestre: req.body.id_semestre,
        cargas: req.body.cargas
      };
      const result = await svc.vincularMateriaPlanConCarga(payload);
      res.status(201).json({ ...result, message: 'Materia vinculada y carga configurada exitosamente' });
    } catch (err) { next(err); }
  },

  // ─── Dirección de Carrera ───
  async getAllCarreras(req, res, next) {
    try { res.json({ carreras: await svc.getAllCarreras() }); }
    catch (err) { next(err); }
  },
  async getCarreraById(req, res, next) {
    try {
      const carrera = await svc.getCarreraById(req.params.id);
      if (!carrera) return res.status(404).json({ error: 'Carrera no encontrada' });
      res.json({ carrera });
    } catch (err) { next(err); }
  },
  async createCarrera(req, res, next) {
    try { res.status(201).json({ carrera: await svc.createCarrera(req.body) }); }
    catch (err) { next(err); }
  },
  async updateCarrera(req, res, next) {
    try {
      const carrera = await svc.updateCarrera(req.params.id, req.body);
      if (!carrera) return res.status(404).json({ error: 'Carrera no encontrada' });
      res.json({ carrera });
    } catch (err) { next(err); }
  },
  async deleteCarrera(req, res, next) {
    try {
      const deleted = await svc.deleteCarrera(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Carrera no encontrada' });
      res.json({ message: 'Carrera eliminada' });
    } catch (err) { next(err); }
  },

  // ─── Prerrequisitos ───
  async getPrerequisitos(req, res, next) {
    try { res.json({ prerequisitos: await svc.getPrerequisitos(req.params.idMatPlan) }); }
    catch (err) { next(err); }
  },
  async createPrerequisito(req, res, next) {
    try { res.status(201).json({ prerequisito: await svc.createPrerequisito(req.body) }); }
    catch (err) { next(err); }
  },
  async deletePrerequisito(req, res, next) {
    try {
      const deleted = await svc.deletePrerequisito(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Prerrequisito no encontrado' });
      res.json({ message: 'Prerrequisito eliminado' });
    } catch (err) { next(err); }
  },

  // ─── Grupo Materia y Asignación Docente ───
  async getGruposByPeriodo(req, res, next) {
    try { res.json({ grupos: await svc.getGruposByPeriodo(req.params.idPeriodo) }); }
    catch (err) { next(err); }
  },
  async createGrupo(req, res, next) {
    try { res.status(201).json({ grupo: await svc.createGrupo(req.body) }); }
    catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'El grupo ya existe para esta materia y periodo' });
      next(err);
    }
  },
  async getDocentesByGrupo(req, res, next) {
    try { res.json({ docentes: await svc.getDocentesByGrupo(req.params.idGrupo) }); }
    catch (err) { next(err); }
  },
  async asignarDocente(req, res, next) {
    try {
      res.status(201).json({
        asignacion: await svc.asignarDocente(req.body),
        message: 'Docente asignado al grupo exitosamente'
      });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'El docente ya está asignado a este grupo' });
      next(err);
    }
  },
  async desasignarDocente(req, res, next) {
    try {
      const id_grupo = req.params.idGrupo || req.body.id_grupo;
      const id_docente = req.params.idDocente || req.body.id_docente;
      const id_asig_doc = req.params.idAsigDoc || req.body.id_asig_doc;
      const asignacion = await svc.desasignarDocente({ id_grupo, id_docente, id_asig_doc });
      res.json({ asignacion, message: 'Docente desasignado del grupo exitosamente' });
    } catch (err) { next(err); }
  },

  // ─── Catálogos auxiliares ───
  async getAllAreasConocimiento(req, res, next) {
    try { res.json({ areas: await svc.getAllAreasConocimiento() }); }
    catch (err) { next(err); }
  },
  async getAllSemestres(req, res, next) {
    try { res.json({ semestres: await svc.getAllSemestres() }); }
    catch (err) { next(err); }
  },
  async getAllModalidades(req, res, next) {
    try { res.json({ modalidades: await svc.getAllModalidades() }); }
    catch (err) { next(err); }
  },
  async getAllTiposClase(req, res, next) {
    try { res.json({ tipos_clase: await svc.getAllTiposClase() }); }
    catch (err) { next(err); }
  },
  async getAllEstadosGrupo(req, res, next) {
    try { res.json({ estados: await svc.getAllEstadosGrupo() }); }
    catch (err) { next(err); }
  },
  async getAllFacultades(req, res, next) {
    try { res.json({ facultades: await svc.getAllFacultades() }); }
    catch (err) { next(err); }
  }
};
