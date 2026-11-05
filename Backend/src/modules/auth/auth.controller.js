// src/modules/auth/auth.controller.js
const authService = require('./auth.service');

module.exports = {
  async register(req, res, next) {
    try {
      const user = await authService.registerUser(req.body);
      res.status(201).json({ user });
    } catch (err) {
      if (err.code === '23503' || err.code === '23514') return res.status(400).json({ error: 'Rol, carrera o catálogo de persona inválido' });
      // Duplicado de email o documento
      if (err.code === '23505') {
        return res.status(409).json({ error: 'El email o documento ya está registrado' });
      }
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const ip_acceso = req.ip || req.connection?.remoteAddress;
      const result = await authService.loginUser({ ...req.body, ip_acceso });
      res.json({ token: result.token, user: result.user });
    } catch (err) {
      res.status(err.statusCode || err.status || 401).json({ error: err.message || 'Credenciales inválidas' });
    }
  },

  async logout(req, res, next) {
    try {
      const jti = req.user?.jti;
      if (!jti) {
        return res.status(400).json({ error: 'Token inválido' });
      }
      await authService.logoutUser(jti);
      res.json({ message: 'Sesión cerrada correctamente' });
    } catch (err) {
      next(err);
    }
  }
  ,
  async getUsers(req, res, next) {
    try { res.json({ usuarios: await authService.getUsers() }); }
    catch (err) { next(err); }
  },

  async updateUserRole(req, res, next) {
    if (!Number.isSafeInteger(Number(req.params.id)) || Number(req.params.id) <= 0) return res.status(400).json({ error: 'Usuario inválido' });
    try {
      const user = await authService.updateUserRole(req.params.id, req.body);
      if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json({ user });
    } catch (err) {
      if (err.code === '23503' || err.code === '23514') return res.status(400).json({ error: 'Rol o carrera inválidos' });
      next(err);
    }
  },

  async updatePassword(req, res, next) {
    try {
      await authService.updatePassword(req.user.userId, req.body);
      res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
      if (err.code === 'INVALID_PASSWORD') return res.status(400).json({ error: err.message });
      next(err);
    }
  }
};
