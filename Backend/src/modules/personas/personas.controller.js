// src/modules/personas/personas.controller.js
const svc = require('./personas.service');

module.exports = {
  async updateDocente(req, res, next) {
    try { res.json({ docente: await svc.updateDocente(req.params.id, req.body) }); }
    catch (err) { next(err); }
  },
  // ─── Docentes ───
  async getAllDocentes(req, res, next) {
    try { res.json({ docentes: await svc.getAllDocentes(req.user) }); }
    catch (err) { next(err); }
  },
  async createDocente(req, res, next) {
    try { res.status(201).json({ docente: await svc.createDocente(req.body) }); }
    catch (err) { next(err); }
  },
  async getDocenteById(req, res, next) {
    try {
      const docente = await svc.getDocenteById(req.params.id, req.user);
      if (!docente) return res.status(404).json({ error: 'Docente no encontrado' });
      res.json({ docente });
    } catch (err) { next(err); }
  },
  async getCarrerasDocente(req, res, next) {
    try { res.json({ carreras: await svc.getCarrerasDocente(req.params.id) }); }
    catch (err) { next(err); }
  },
  async getHorariosDocente(req, res, next) {
    try { res.json({ horarios: await svc.getHorariosDocente(req.params.id) }); }
    catch (err) { next(err); }
  },

  // ─── Estudiantes ───
  async getAllEstudiantes(req, res, next) {
    try {
      const { idCarrera } = req.query;
      res.json({ estudiantes: await svc.getAllEstudiantes({ idCarrera }, req.user) });
    } catch (err) { next(err); }
  },
  async getEstudianteById(req, res, next) {
    try {
      const estudiante = await svc.getEstudianteById(req.params.id, req.user);
      if (!estudiante) return res.status(404).json({ error: 'Estudiante no encontrado' });
      res.json({ estudiante });
    } catch (err) { next(err); }
  },
  async getInscripciones(req, res, next) {
    try { res.json({ inscripciones: await svc.getInscripciones(req.params.id, req.user) }); }
    catch (err) { next(err); }
  },

  // ─── Directores ───
  async getAllDirectores(req, res, next) {
    try { res.json({ directores: await svc.getAllDirectores() }); }
    catch (err) { next(err); }
  },
  async getDirectorByCarrera(req, res, next) {
    try {
      const director = await svc.getDirectorByCarrera(req.params.idCarrera);
      if (!director) return res.status(404).json({ error: 'Director no encontrado' });
      res.json({ director });
    } catch (err) { next(err); }
  },

  // ─── Catálogos ───
  async getAllTiposDocumento(req, res, next) {
    try { res.json({ tipos: await svc.getAllTiposDocumento() }); }
    catch (err) { next(err); }
  },
  async getAllNacionalidades(req, res, next) {
    try { res.json({ nacionalidades: await svc.getAllNacionalidades() }); }
    catch (err) { next(err); }
  },
  async getAllTiposContrato(req, res, next) {
    try { res.json({ tipos: await svc.getAllTiposContrato() }); }
    catch (err) { next(err); }
  },
  async getAllEstadosUsuario(req, res, next) {
    try { res.json({ estados: await svc.getAllEstadosUsuario() }); }
    catch (err) { next(err); }
  }
};
