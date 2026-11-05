// src/modules/auth/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { verifyToken, requireAdministrator } = require('../../middlewares/authMiddleware');

// POST /api/auth/register
router.post('/register', verifyToken, requireAdministrator, authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/logout  (requiere estar autenticado)
router.post('/logout', verifyToken, authController.logout);

// Administración de usuarios y credenciales
router.get('/me', verifyToken, (req, res) => {
  const { id_usuario, email, nombres, apellidos, roles, rol, id_direccion, id_director, carreras_permitidas, can_manage } = req.user;
  res.json({ user: { id_usuario, email, nombres, apellidos, roles, rol, id_direccion, id_director, carreras_permitidas, can_manage } });
});
router.get('/usuarios', verifyToken, requireAdministrator, authController.getUsers);
router.put('/password', verifyToken, authController.updatePassword);
router.put('/usuarios/:id/rol', verifyToken, requireAdministrator, authController.updateUserRole);

module.exports = router;
