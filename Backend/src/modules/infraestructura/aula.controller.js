// src/modules/infraestructura/aula.controller.js
const aulaService = require('./aula.service');

module.exports = {
  // ─── Catálogos Auxiliares ───
  async getTiposRecurso(req, res, next) {
    try { res.json({ tipos: await aulaService.getTiposRecurso() }); } catch (err) { next(err); }
  },
  async getTiposAula(req, res, next) {
    try { res.json({ tipos: await aulaService.getTiposAula() }); } catch (err) { next(err); }
  },
  async getEstadosAula(req, res, next) {
    try { res.json({ estados: await aulaService.getEstadosAula() }); } catch (err) { next(err); }
  },
  async getFacultades(req, res, next) {
    try { res.json({ facultades: await aulaService.getAllFacultades() }); } catch (err) { next(err); }
  },

  // ─── Recursos en Aulas ───
  async addRecurso(req, res, next) {
    const { descripcion, id_tipo_recurso, nro_serie } = req.body;
    if (!Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) <= 0 ||
        !Number.isSafeInteger(Number(id_tipo_recurso)) || Number(id_tipo_recurso) <= 0 ||
        typeof descripcion !== 'string' || !descripcion.trim() || descripcion.length > 150 ||
        (nro_serie != null && (typeof nro_serie !== 'string' || nro_serie.length > 80))) {
      return res.status(400).json({ error: 'Indica aula, tipo y descripción válidos' });
    }
    try {
      res.status(201).json({ recurso: await aulaService.addRecurso(req.params.id, req.body) });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'El número de serie ya existe' });
      if (err.code === '23503') return res.status(400).json({ error: 'Aula o tipo de recurso no encontrado' });
      next(err);
    }
  },
  async removeRecurso(req, res, next) {
    if (![req.params.id, req.params.idRecAula].every((id) => Number.isSafeInteger(Number(id)) && Number(id) > 0)) {
      return res.status(400).json({ error: 'Identificador inválido' });
    }
    try {
      const removed = await aulaService.removeRecurso(req.params.id, req.params.idRecAula);
      if (!removed) return res.status(404).json({ error: 'El recurso no está instalado en esta aula' });
      res.json({ message: 'Recurso retirado del aula' });
    } catch (err) { next(err); }
  },

  // ─── Pabellones ───
  async getAllPabellones(req, res, next) {
    try { res.json({ pabellones: await aulaService.getAllPabellones() }); } catch (err) { next(err); }
  },
  async getPabellonById(req, res, next) {
    try {
      const pabellon = await aulaService.getPabellonById(req.params.idPabellon || req.params.id);
      if (!pabellon) return res.status(404).json({ error: 'Pabellón no encontrado' });
      res.json({ pabellon });
    } catch (err) { next(err); }
  },
  async createPabellon(req, res, next) {
    try {
      const pabellon = await aulaService.createPabellon(req.body);
      res.status(201).json({ pabellon, message: 'Pabellón creado exitosamente' });
    } catch (err) { next(err); }
  },
  async updatePabellon(req, res, next) {
    try {
      const pabellon = await aulaService.updatePabellon(req.params.idPabellon || req.params.id, req.body);
      res.json({ pabellon, message: 'Pabellón actualizado exitosamente' });
    } catch (err) { next(err); }
  },
  async deletePabellon(req, res, next) {
    try {
      const result = await aulaService.deletePabellon(req.params.idPabellon || req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  },

  // ─── Pisos ───
  async getPisosByPabellon(req, res, next) {
    try {
      const pisos = await aulaService.getPisosByPabellon(req.params.idPabellon);
      res.json({ pisos });
    } catch (err) { next(err); }
  },
  async getPisoById(req, res, next) {
    try {
      const piso = await aulaService.getPisoById(req.params.id);
      if (!piso) return res.status(404).json({ error: 'Piso no encontrado' });
      res.json({ piso });
    } catch (err) { next(err); }
  },
  async createPiso(req, res, next) {
    try {
      const piso = await aulaService.createPiso(req.body);
      res.status(201).json({ piso, message: 'Piso registrado exitosamente' });
    } catch (err) { next(err); }
  },
  async updatePiso(req, res, next) {
    try {
      const piso = await aulaService.updatePiso(req.params.id, req.body);
      res.json({ piso, message: 'Piso actualizado exitosamente' });
    } catch (err) { next(err); }
  },
  async deletePiso(req, res, next) {
    try {
      const result = await aulaService.deletePiso(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  },

  // ─── Aulas ───
  async getAll(req, res, next) {
    try {
      const aulas = await aulaService.getAll({
        idPabellon: req.query.pabellon,
        numeroPiso: req.query.piso,
      });
      res.json({ aulas });
    } catch (err) { next(err); }
  },
  async getById(req, res, next) {
    try {
      const aula = await aulaService.getById(req.params.id);
      if (!aula) return res.status(404).json({ error: 'Aula no encontrada' });
      res.json({ aula });
    } catch (err) { next(err); }
  },
  async createAula(req, res, next) {
    try {
      const aula = await aulaService.createAula(req.body);
      res.status(201).json({ aula, message: 'Aula creada exitosamente' });
    } catch (err) { next(err); }
  },
  async updateAula(req, res, next) {
    try {
      const aula = await aulaService.updateAula(req.params.id, req.body);
      res.json({ aula, message: 'Aula actualizada exitosamente' });
    } catch (err) { next(err); }
  },
  async deleteAula(req, res, next) {
    try {
      const inhabilitar = req.query.inhabilitar === 'true' || req.body?.inhabilitar === true;
      const result = await aulaService.deleteAula(req.params.id, inhabilitar);
      res.json(result);
    } catch (err) { next(err); }
  },
  async getByPabellon(req, res, next) {
    try {
      const aulas = await aulaService.getByPabellon(req.params.idPabellon);
      res.json({ aulas });
    } catch (err) { next(err); }
  },
  async getDisponibles(req, res, next) {
    try {
      const { dia, bloque, periodo } = req.query;
      if (!dia || !bloque) return res.status(400).json({ error: 'Los parámetros dia y bloque son obligatorios' });
      const aulas = await aulaService.getDisponibles({ dia, bloque, periodo });
      res.json({ aulas });
    } catch (err) { next(err); }
  },
  async getCarrerasByAula(req, res, next) {
    try {
      const carreras = await aulaService.getCarrerasByAula(req.params.id);
      res.json({ carreras });
    } catch (err) { next(err); }
  },
  async getRecursosByAula(req, res, next) {
    try {
      const recursos = await aulaService.getRecursosByAula(req.params.id);
      res.json({ recursos });
    } catch (err) { next(err); }
  }
};
