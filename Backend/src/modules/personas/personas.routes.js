// src/modules/personas/personas.routes.js
const express = require('express');
const router = express.Router();
const { protectWrites } = require('../../middlewares/authMiddleware');
router.use(protectWrites);
const ctrl = require('./personas.controller');
const { ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA } = require('../../utils/roles');
const { verifyToken, verifyRole } = require('../../middlewares/authMiddleware');
const privateRecords = verifyRole([ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA]);

// ─── Catálogos persona ───
router.get('/tipos-documento',  verifyToken, ctrl.getAllTiposDocumento);
router.get('/nacionalidades',   verifyToken, ctrl.getAllNacionalidades);
router.get('/tipos-contrato',   verifyToken, ctrl.getAllTiposContrato);
router.get('/estados-usuario',  verifyToken, ctrl.getAllEstadosUsuario);

// ─── Docentes ───
router.get('/docentes',              verifyToken, ctrl.getAllDocentes);
router.post('/docentes',             verifyToken, privateRecords, ctrl.createDocente);
router.get('/docentes/:id',          verifyToken, ctrl.getDocenteById);
router.get('/docentes/:id/carreras', verifyToken, ctrl.getCarrerasDocente);
router.get('/docentes/:id/horarios', verifyToken, ctrl.getHorariosDocente);

// ─── Estudiantes ───
router.get('/estudiantes',                verifyToken, privateRecords, ctrl.getAllEstudiantes);
router.get('/estudiantes/:id',            verifyToken, privateRecords, ctrl.getEstudianteById);
router.get('/estudiantes/:id/inscripciones', verifyToken, privateRecords, ctrl.getInscripciones);

// ─── Directores ───
router.get('/directores',                      verifyToken, ctrl.getAllDirectores);
router.get('/directores/carrera/:idCarrera',    verifyToken, ctrl.getDirectorByCarrera);

module.exports = router;
