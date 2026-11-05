// src/middlewares/errorHandler.js
module.exports.errorHandler = (err, req, res, next) => {
  console.error(err);
  const pgStatus = { '23503':400, '23502':400, '23514':400, '22P02':400, '23505':409, 'P0001':409, '40001':409, '40P01':409, '55P03':409 };
  const status = err.statusCode || err.status || pgStatus[err.code] || 500;
  const messages = { '40001':'El calendario cambio durante la operacion. Recarga e intenta nuevamente', '40P01':'Otra operacion modifico el calendario. Intenta nuevamente', '55P03':'El calendario esta siendo actualizado. Intenta nuevamente', '23503':'El registro esta vinculado a otros datos o un identificador no existe', '23502':'Faltan datos obligatorios', '23514':'Los datos no cumplen las restricciones', '22P02':'Formato de datos invalido', '23505':'El registro ya existe' };
  const message = messages[err.code] || err.message || 'Internal Server Error';
  res.status(status).json({ error: message, ...(err.conflictCode ? {conflictCode:err.conflictCode} : {}) });
};
