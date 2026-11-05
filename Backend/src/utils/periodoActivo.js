// Selector compartido para consultas sin un periodo explicito.
const PERIODO_ACTIVO_SQL = `
  SELECT id_periodo, gestion, fecha_inicio, fecha_fin
  FROM periodo_academico
  WHERE activo = TRUE
  ORDER BY id_periodo DESC
  LIMIT 1
`;
module.exports = { PERIODO_ACTIVO_SQL };
