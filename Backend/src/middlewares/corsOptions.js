// src/middlewares/corsOptions.js
module.exports = {
  origin: '*', // Ajustar en producción
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
