// src/middlewares/notFound.js
module.exports.notFound = (req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
};
