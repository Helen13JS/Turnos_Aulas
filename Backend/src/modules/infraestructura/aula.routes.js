// src/modules/infraestructura/aula.routes.js
const express = require('express');
const router = express.Router();
const { protectWrites, verifyToken } = require('../../middlewares/authMiddleware');

// Control de autorizaciones de escritura globales y por rol
router.use(protectWrites);

const aulaController = require('./aula.controller');

// ─── Catálogos Auxiliares ───
router.get('/tipos-aula', verifyToken, aulaController.getTiposAula);
router.get('/estados-aula', verifyToken, aulaController.getEstadosAula);
router.get('/facultades', verifyToken, aulaController.getFacultades);
router.get('/tipos-recurso', verifyToken, aulaController.getTiposRecurso);

// ─── Pabellones ───
// GET /api/infraestructura/pabellones
router.get('/pabellones', verifyToken, aulaController.getAllPabellones);
router.get('/pabellones/:idPabellon', verifyToken, aulaController.getPabellonById);
router.post('/pabellones', verifyToken, aulaController.createPabellon);
router.put('/pabellones/:idPabellon', verifyToken, aulaController.updatePabellon);
router.delete('/pabellones/:idPabellon', verifyToken, aulaController.deletePabellon);

// ─── Pisos ───
// GET /api/infraestructura/pabellones/:idPabellon/pisos
router.get('/pabellones/:idPabellon/pisos', verifyToken, aulaController.getPisosByPabellon);
router.get('/pisos/:id', verifyToken, aulaController.getPisoById);
router.post('/pisos', verifyToken, aulaController.createPiso);
router.put('/pisos/:id', verifyToken, aulaController.updatePiso);
router.delete('/pisos/:id', verifyToken, aulaController.deletePiso);

// ─── Aulas Disponibles y Filtros por Pabellón ───
router.get('/pabellones/:idPabellon/aulas', verifyToken, aulaController.getByPabellon);
router.get('/aulas/disponibles', verifyToken, aulaController.getDisponibles);

// ─── Recursos de Aulas ───
router.post('/aulas/:id/recursos', verifyToken, aulaController.addRecurso);
router.delete('/aulas/:id/recursos/:idRecAula', verifyToken, aulaController.removeRecurso);

// ─── Aulas CRUD ───
router.get('/aulas', verifyToken, aulaController.getAll);
router.post('/aulas', verifyToken, aulaController.createAula);
router.get('/aulas/:id', verifyToken, aulaController.getById);
router.put('/aulas/:id', verifyToken, aulaController.updateAula);
router.delete('/aulas/:id', verifyToken, aulaController.deleteAula);

router.get('/aulas/:id/carreras', verifyToken, aulaController.getCarrerasByAula);
router.get('/aulas/:id/recursos', verifyToken, aulaController.getRecursosByAula);

module.exports = router;
