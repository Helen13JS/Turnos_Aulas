BEGIN;
ALTER TABLE docente ADD COLUMN IF NOT EXISTS activo boolean NOT NULL DEFAULT TRUE;
COMMENT ON COLUMN docente.activo IS 'Estado del registro docente, independiente del estado de su cuenta de acceso. No modifica horarios existentes.';
COMMIT;
