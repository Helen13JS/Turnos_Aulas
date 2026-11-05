// src/modules/horarios/horario.routes.js
const express = require('express');
const router = express.Router();
const { protectWrites } = require('../../middlewares/authMiddleware');
router.use(protectWrites);
const ctrl = require('./horario.controller');
const { verifyToken, checkPermission } = require('../../middlewares/authMiddleware');

// ─── Catálogos (consulta) ───
router.get('/bloques', verifyToken, ctrl.getBloques);
router.get('/dias',    verifyToken, ctrl.getDias);

// ─── Horarios de clase ───
// POST   → crea horario (triggers: choque_aula, choque_docente → 409)
router.post('/clase/lote', verifyToken, async (req,res,next) => {
  try { res.status(201).json({horarios:await require('./horario.service').crearHorariosLote(req.body.horarios)}); } catch(e) { next(e); }
});
router.delete('/clase/lote', verifyToken, async (req,res,next) => {
  try { res.json({eliminados:await require('./horario.service').eliminarHorariosLote(req.body.ids)}); } catch(e) { next(e); }
});
router.post('/clase',
  verifyToken, checkPermission('CREAR_HORARIO'),
  ctrl.crearHorario
);

// PUT    → actualiza horario (triggers: choque_aula, choque_docente → 409)
router.put('/clase/:id',
  verifyToken, checkPermission('CREAR_HORARIO'),
  ctrl.updateHorario
);

// GET    → horarios por aula
router.get('/clase/aula/:idAula', verifyToken, ctrl.getByAula);

// GET    → horarios por grupo
router.get('/clase/grupo/:idGrupo', verifyToken, ctrl.getByGrupo);

// GET    → disponibilidad de un aula en un periodo (matriz día × bloque)
router.get('/disponibilidad/:idAula/:idPeriodo', verifyToken, ctrl.getDisponibilidad);

// DELETE → eliminar horario
router.delete('/clase/:id',
  verifyToken, checkPermission('ELIMINAR_HORARIO'),
  ctrl.deleteHorario
);

// ─── Reservas temporales ───
// POST   → crea reserva (trigger: choque_reserva → 409)
router.post('/reserva',
  verifyToken, checkPermission('CREAR_RESERVA'),
  ctrl.crearReserva
);

// GET    → reservas por aula
router.get('/reserva/aula/:idAula', verifyToken, ctrl.getReservasByAula);

// GET    → reservas por fecha (YYYY-MM-DD)
router.get('/reserva/fecha/:fecha', verifyToken, ctrl.getReservasByFecha);

// DELETE → eliminar reserva
router.delete('/reserva/:id',
  verifyToken, checkPermission('ELIMINAR_RESERVA'),
  ctrl.deleteReserva
);

module.exports = router;
