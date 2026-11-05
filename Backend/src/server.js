// src/server.js
require('dotenv').config();
const config = require('./config');
const app = require('./app');
const cronService = require('./modules/automatizacion/cron.service');

// Iniciar tareas programadas
cronService.iniciar();

app.listen(config.port, () => {
  console.log(`Servidor corriendo en el puerto ${config.port}`);
});
