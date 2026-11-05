// src/app.js
const express = require('express');
const cors = require('cors');
const corsOptions = require('./middlewares/corsOptions');
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');

// Importar rutas de cada módulo
const authRoutes        = require('./modules/auth/auth.routes');
const authController    = require('./modules/auth/auth.controller');
const infraRoutes       = require('./modules/infraestructura/aula.routes');
const horarioRoutes     = require('./modules/horarios/horario.routes');
const academicoRoutes   = require('./modules/academico/academico.routes');
const personasRoutes    = require('./modules/personas/personas.routes');
const solicitudesRoutes = require('./modules/solicitudes/solicitudes.routes');
const aulaController = require('./modules/infraestructura/aula.controller');
const { verifyToken } = require('./middlewares/authMiddleware');

const app = express();

// Middleware global
app.use(cors(corsOptions));
app.use(express.json());

// Health check (sin autenticación)
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Montar módulos
app.use('/api/auth',            authRoutes);
app.post('/api/login',          authController.login);
app.use('/api/infraestructura', infraRoutes);
app.get('/api/aulas/disponibles', verifyToken, aulaController.getDisponibles);
app.use('/api/horarios',        horarioRoutes);
app.use('/api/academico',       academicoRoutes);
app.use('/api/personas',        personasRoutes);
app.use('/api/solicitudes',     solicitudesRoutes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
