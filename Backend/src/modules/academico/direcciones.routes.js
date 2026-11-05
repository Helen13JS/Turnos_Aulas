const router = require('express').Router();
const db = require('../../config/db');
const { verifyToken, verifyRole } = require('../../middlewares/authMiddleware');
const { ROLE_SUPER_ADMIN, ROLE_DIRECTOR_CARRERA } = require('../../utils/roles');
const { getPeriodoActivo, getGruposByPeriodo } = require('./academico.service');
const superOnly = verifyRole([ROLE_SUPER_ADMIN]);
const positive = v => Number.isSafeInteger(Number(v)) && Number(v) > 0;

router.use(verifyToken);
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await db.query(`SELECT d.*,COALESCE(json_agg(json_build_object('id_carrera',c.id_carrera,'nombre_carrera',c.nombre_carrera,'id_facultad',c.id_facultad) ORDER BY c.id_carrera) FILTER (WHERE c.id_carrera IS NOT NULL),'[]'::json) AS carreras
      FROM direccion_academica d LEFT JOIN direccion_carrera c USING(id_direccion)
      GROUP BY d.id_direccion ORDER BY d.codigo`);
    res.json({ direcciones: rows });
  } catch (err) { next(err); }
});
router.post('/', superOnly, async (req, res, next) => {
  const { codigo, nombre_direccion } = req.body;
  if (typeof codigo !== 'string' || !codigo.trim() || codigo.trim().length > 30 || typeof nombre_direccion !== 'string' || !nombre_direccion.trim() || nombre_direccion.trim().length > 150) return res.status(400).json({ error: 'Código y nombre de Dirección obligatorios (máximo 30 y 150 caracteres)' });
  try {
    const { rows } = await db.query('INSERT INTO direccion_academica(codigo,nombre_direccion) VALUES($1,$2) RETURNING *', [codigo.trim().toUpperCase(),nombre_direccion.trim()]);
    res.status(201).json({ direccion: rows[0] });
  } catch (err) { if (err.code === '23505') return res.status(409).json({ error: 'El código de Dirección ya existe' }); next(err); }
});
router.put('/:id/carreras/:idCarrera', superOnly, async (req, res, next) => {
  if (!positive(req.params.id) || !positive(req.params.idCarrera)) return res.status(400).json({ error: 'Identificadores inválidos' });
  try {
    const { rows } = await db.query('UPDATE direccion_carrera SET id_direccion=$1 WHERE id_carrera=$2 RETURNING *', [req.params.id,req.params.idCarrera]);
    if (!rows.length) return res.status(404).json({ error: 'Carrera no encontrada' });
    res.json({ carrera: rows[0] });
  } catch (err) { if (err.code === '23503') return res.status(400).json({ error: 'Dirección no encontrada' }); next(err); }
});
router.get('/:id/oferta', async (req, res, next) => {
  if (!positive(req.params.id)) return res.status(400).json({ error: 'Dirección inválida' });
  if (req.user.rol === ROLE_DIRECTOR_CARRERA && Number(req.user.id_direccion) !== Number(req.params.id)) return res.status(403).json({ error: 'La oferta no pertenece a su Dirección' });
  try {
    if (!(await db.query('SELECT 1 FROM direccion_academica WHERE id_direccion=$1', [req.params.id])).rowCount) return res.status(404).json({ error: 'Dirección no encontrada' });
    const periodo = req.query.periodo || (await getPeriodoActivo())?.id_periodo;
    if (!positive(periodo)) return res.status(400).json({ error: 'No existe período válido para consultar' });
    res.json({ grupos: await getGruposByPeriodo(periodo, req.params.id) });
  } catch (err) { next(err); }
});
module.exports = router;
