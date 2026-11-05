// src/modules/horarios/horario.controller.js
const horarioService = require('./horario.service');
const { parseUniqueError, parseForeignKeyError } = require('../../utils/pgErrorParser');

module.exports = {
  // ═══════════════════════════════════════════
  // HORARIO DE CLASE
  // ═══════════════════════════════════════════

  /**
   * POST /api/horarios/clase
   * Crea un horario. Si un trigger detecta choque → 409 con detalle.
   */
  async crearHorario(req, res, next) {
    try {
      const required = ['id_grupo', 'id_aula', 'id_dia', 'id_bloque', 'id_tipo_clase'];
      const missing = required.filter((field) => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');
      if (missing.length) {
        return res.status(400).json({ error: `Faltan campos obligatorios: ${missing.join(', ')}`, fields: missing });
      }
      const horario = await horarioService.crearHorarioClase(req.body);
      res.status(201).json({ horario: horario.horario, warning: horario.warning || null });
    } catch (err) {
      // Error lanzado por nuestro service con status y conflictCode
      if (err.status === 409) {
        return res.status(409).json({
          error: err.message,
          conflictCode: err.conflictCode,
          triggerMessage: err.triggerMessage
        });
      }
      // FK inválida (grupo, aula, día, bloque o tipo_clase no existen)
      const fk = parseForeignKeyError(err);
      if (fk) return res.status(fk.httpStatus).json({ error: fk.userMessage });
      next(err);
    }
  },

  /**
   * PUT /api/horarios/clase/:id
   * Actualiza un horario. También dispara triggers de choque.
   */
  async updateHorario(req, res, next) {
    try {
      const horario = await horarioService.updateHorarioClase(req.params.id, req.body);
      if (!horario) return res.status(404).json({ error: 'Horario no encontrado' });
      res.json({ horario });
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({
          error: err.message,
          conflictCode: err.conflictCode,
          triggerMessage: err.triggerMessage
        });
      }
      const fk = parseForeignKeyError(err);
      if (fk) return res.status(fk.httpStatus).json({ error: fk.userMessage });
      next(err);
    }
  },

  /**
   * GET /api/horarios/clase/aula/:idAula
   */
  async getByAula(req, res, next) {
    try {
      const horarios = await horarioService.getByAula(req.params.idAula);
      res.json({ horarios });
    } catch (err) { next(err); }
  },

  /**
   * GET /api/horarios/clase/grupo/:idGrupo
   */
  async getByGrupo(req, res, next) {
    try {
      const horarios = await horarioService.getByGrupo(req.params.idGrupo);
      res.json({ horarios });
    } catch (err) { next(err); }
  },

  /**
   * GET /api/horarios/disponibilidad/:idAula/:idPeriodo
   * Devuelve la matriz día × bloque de ocupación del aula.
   */
  async getDisponibilidad(req, res, next) {
    try {
      const disponibilidad = await horarioService.getDisponibilidadAula(
        req.params.idAula, req.params.idPeriodo
      );
      res.json({ disponibilidad });
    } catch (err) { next(err); }
  },

  /**
   * DELETE /api/horarios/clase/:id
   */
  async deleteHorario(req, res, next) {
    try {
      const deleted = await horarioService.deleteHorario(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Horario no encontrado' });
      res.json({ message: 'Horario eliminado' });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ error: err.message });
      next(err);
    }
  },

  // ═══════════════════════════════════════════
  // RESERVA TEMPORAL
  // ═══════════════════════════════════════════

  /**
   * POST /api/horarios/reserva
   * Crea una reserva. Si el trigger detecta choque → 409 con detalle.
   */
  async crearReserva(req, res, next) {
    try {
      const reserva = await horarioService.crearReservaTemporal(req.body);
      res.status(201).json({ reserva });
    } catch (err) {
      if (err.status === 409) {
        return res.status(409).json({
          error: err.message,
          conflictCode: err.conflictCode,
          triggerMessage: err.triggerMessage
        });
      }
      const fk = parseForeignKeyError(err);
      if (fk) return res.status(fk.httpStatus).json({ error: fk.userMessage });
      next(err);
    }
  },

  /**
   * GET /api/horarios/reserva/aula/:idAula
   */
  async getReservasByAula(req, res, next) {
    try {
      const reservas = await horarioService.getReservasByAula(req.params.idAula);
      res.json({ reservas });
    } catch (err) { next(err); }
  },

  /**
   * GET /api/horarios/reserva/fecha/:fecha
   * Reservas de una fecha específica (formato YYYY-MM-DD).
   */
  async getReservasByFecha(req, res, next) {
    try {
      const reservas = await horarioService.getReservasByFecha(req.params.fecha);
      res.json({ reservas });
    } catch (err) { next(err); }
  },

  /**
   * DELETE /api/horarios/reserva/:id
   */
  async deleteReserva(req, res, next) {
    try {
      const deleted = await horarioService.deleteReserva(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Reserva no encontrada' });
      res.json({ message: 'Reserva eliminada' });
    } catch (err) { next(err); }
  },

  // ═══════════════════════════════════════════
  // CATÁLOGOS
  // ═══════════════════════════════════════════

  async getBloques(req, res, next) {
    try { res.json({ bloques: await horarioService.getAllBloques() }); }
    catch (err) { next(err); }
  },

  async getDias(req, res, next) {
    try { res.json({ dias: await horarioService.getAllDias() }); }
    catch (err) { next(err); }
  }
};
