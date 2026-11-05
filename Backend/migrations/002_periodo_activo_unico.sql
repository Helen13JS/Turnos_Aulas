-- Demo: periodo 4 (17 grupos, 174 franjas en la auditoria).
-- Conserva los datos historicos; revisar el ID antes de usar en otro entorno.
BEGIN;
LOCK TABLE periodo_academico IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM periodo_academico WHERE id_periodo = 4) THEN
    RAISE EXCEPTION 'No existe el periodo 4; migracion cancelada sin cambios';
  END IF;
END $$;
UPDATE periodo_academico SET activo = FALSE WHERE activo = TRUE AND id_periodo <> 4;
UPDATE periodo_academico SET activo = TRUE WHERE id_periodo = 4;
CREATE UNIQUE INDEX IF NOT EXISTS uq_periodo_academico_unico_activo
  ON periodo_academico (activo) WHERE activo = TRUE;
COMMIT;
SELECT id_periodo, gestion, activo FROM periodo_academico ORDER BY id_periodo;
