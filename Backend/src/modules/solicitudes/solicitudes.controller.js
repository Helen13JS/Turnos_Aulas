// src/modules/solicitudes/solicitudes.controller.js
const svc = require('./solicitudes.service');
const { parseUniqueError, parseForeignKeyError } = require('../../utils/pgErrorParser');

module.exports = {
  // ─── Solicitudes de cambio ───
  async crearSolicitud(req, res, next) {
    try { res.status(201).json({ solicitud: await svc.crearSolicitud(req.body) }); }
    catch (err) {
      const fk = parseForeignKeyError(err);
      if (fk) return res.status(fk.httpStatus).json({ error: fk.userMessage });
      next(err);
    }
  },
  async getSolicitudesByDocente(req, res, next) {
    try { res.json({ solicitudes: await svc.getSolicitudesByDocente(req.params.idDocente) }); }
    catch (err) { next(err); }
  },
  async getSolicitudesPendientes(req, res, next) {
    try { res.json({ solicitudes: await svc.getSolicitudesPendientes(req.params.idDirector) }); }
    catch (err) { next(err); }
  },
  async resolverSolicitud(req, res, next) {
    try {
      const historial = await svc.resolverSolicitud(req.body);
      res.json({ historial, message: req.body.aprobado ? 'Solicitud aprobada' : 'Solicitud rechazada' });
    } catch (err) { next(err); }
  },

  // ─── Excepciones de horario (endpoint de apoyo para Fase 4) ───
  async crearExcepcion(req, res, next) {
    try { res.status(201).json({ excepcion: await svc.crearExcepcion(req.body) }); }
    catch (err) {
      const dup = parseUniqueError(err);
      if (dup) return res.status(dup.httpStatus).json({
        error: 'Ya existe una excepción para ese horario y fecha',
        conflictCode: 'EXCEPCION_DUPLICADA'
      });
      const fk = parseForeignKeyError(err);
      if (fk) return res.status(fk.httpStatus).json({ error: fk.userMessage });
      next(err);
    }
  },
  async getExcepcionesByPeriodo(req, res, next) {
    try { res.json({ excepciones: await svc.getExcepcionesByPeriodo(req.params.idPeriodo) }); }
    catch (err) { next(err); }
  },

  // ─── Feriados (endpoint de apoyo para Fase 4) ───
  async getFeriadosByPeriodo(req, res, next) {
    try { res.json({ feriados: await svc.getFeriadosByPeriodo(req.params.idPeriodo) }); }
    catch (err) { next(err); }
  },
  async crearFeriado(req, res, next) {
    try { res.status(201).json({ feriado: await svc.crearFeriado(req.body) }); }
    catch (err) {
      const dup = parseUniqueError(err);
      if (dup) return res.status(dup.httpStatus).json({
        error: 'Ya existe un feriado para esa fecha y periodo',
        conflictCode: 'FERIADO_DUPLICADO'
      });
      next(err);
    }
  },

  // ─── Catálogos ───
  async getAllTiposSolicitud(req, res, next) {
    try { res.json({ tipos: await svc.getAllTiposSolicitud() }); }
    catch (err) { next(err); }
  },
  async getAllEstadosSolicitud(req, res, next) {
    try { res.json({ estados: await svc.getAllEstadosSolicitud() }); }
    catch (err) { next(err); }
  },
  async getAllMotivosRechazo(req, res, next) {
    try { res.json({ motivos: await svc.getAllMotivosRechazo() }); }
    catch (err) { next(err); }
  },
  async getAllMotivosExcepcion(req, res, next) {
    try { res.json({ motivos: await svc.getAllMotivosExcepcion() }); }
    catch (err) { next(err); }
  }
};
