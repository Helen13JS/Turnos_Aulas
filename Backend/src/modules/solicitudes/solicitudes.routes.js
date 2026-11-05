// src/modules/solicitudes/solicitudes.routes.js
const express = require('express');
const router = express.Router();
const { protectWrites } = require('../../middlewares/authMiddleware');
router.use(protectWrites);
const ctrl = require('./solicitudes.controller');
const { verifyToken, checkPermission } = require('../../middlewares/authMiddleware');

// ─── Catálogos ───
router.get('/tipos-solicitud',   verifyToken, ctrl.getAllTiposSolicitud);
router.get('/estados-solicitud', verifyToken, ctrl.getAllEstadosSolicitud);
router.get('/motivos-rechazo',   verifyToken, ctrl.getAllMotivosRechazo);
router.get('/motivos-excepcion', verifyToken, ctrl.getAllMotivosExcepcion);

// ─── Solicitudes de cambio ───
router.post('/cambio',                        verifyToken, checkPermission('CREAR_SOLICITUD'), ctrl.crearSolicitud);
router.get('/cambio/docente/:idDocente',       verifyToken, ctrl.getSolicitudesByDocente);
router.get('/cambio/pendientes/:idDirector',   verifyToken, checkPermission('RESOLVER_SOLICITUD'), ctrl.getSolicitudesPendientes);
router.post('/cambio/resolver',               verifyToken, checkPermission('RESOLVER_SOLICITUD'), ctrl.resolverSolicitud);

// ─── Excepciones de horario ───
router.post('/excepciones',                    verifyToken, checkPermission('GESTIONAR_EXCEPCION'), ctrl.crearExcepcion);
router.get('/excepciones/periodo/:idPeriodo',  verifyToken, ctrl.getExcepcionesByPeriodo);

// ─── Feriados ───
router.get('/feriados/periodo/:idPeriodo',     verifyToken, ctrl.getFeriadosByPeriodo);
router.post('/feriados',                       verifyToken, checkPermission('GESTIONAR_FERIADO'), ctrl.crearFeriado);

module.exports = router;
