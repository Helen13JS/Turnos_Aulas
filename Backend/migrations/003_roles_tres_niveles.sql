BEGIN;
LOCK TABLE usuario IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS rol VARCHAR(32);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS id_carrera INT REFERENCES direccion_carrera(id_carrera);
UPDATE usuario u SET rol = CASE
  WHEN EXISTS (SELECT 1 FROM usuario_rol ur JOIN rol r USING(id_rol) WHERE ur.id_usuario=u.id_usuario AND UPPER(TRIM(r.nombre_rol)) IN ('ADMIN','ADMINISTRADOR','ROLE_SUPER_ADMIN')) THEN 'ROLE_SUPER_ADMIN'
  WHEN EXISTS (SELECT 1 FROM usuario_rol ur JOIN rol r USING(id_rol) WHERE ur.id_usuario=u.id_usuario AND UPPER(TRIM(r.nombre_rol)) IN ('DIRECTOR','DIRECTOR DE CARRERA','ROLE_DIRECTOR_CARRERA')) THEN 'ROLE_DIRECTOR_CARRERA'
  ELSE 'ROLE_VISUALIZADOR' END WHERE u.rol IS NULL;
UPDATE usuario u SET id_carrera = (SELECT MIN(d.id_carrera) FROM director_carrera d WHERE d.id_persona=u.id_persona HAVING COUNT(DISTINCT d.id_carrera)=1)
WHERE u.rol='ROLE_DIRECTOR_CARRERA' AND u.id_carrera IS NULL;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM usuario WHERE rol='ROLE_DIRECTOR_CARRERA' AND id_carrera IS NULL) THEN
    RAISE EXCEPTION 'Hay directores sin una carrera inequívoca; asigne su programa antes de migrar';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM usuario WHERE rol='ROLE_SUPER_ADMIN') THEN
    RAISE EXCEPTION 'No se encontró un administrador general; migración cancelada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='usuario'::regclass AND conname='usuario_rol_tres_niveles') THEN
    ALTER TABLE usuario ADD CONSTRAINT usuario_rol_tres_niveles CHECK (rol IN ('ROLE_SUPER_ADMIN','ROLE_DIRECTOR_CARRERA','ROLE_VISUALIZADOR'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='usuario'::regclass AND conname='usuario_rol_carrera_coherente') THEN
    ALTER TABLE usuario ADD CONSTRAINT usuario_rol_carrera_coherente CHECK ((rol='ROLE_DIRECTOR_CARRERA' AND id_carrera IS NOT NULL) OR (rol<>'ROLE_DIRECTOR_CARRERA' AND id_carrera IS NULL));
  END IF;
END $$;
ALTER TABLE usuario ALTER COLUMN rol SET DEFAULT 'ROLE_VISUALIZADOR';
ALTER TABLE usuario ALTER COLUMN rol SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usuario_rol_carrera ON usuario(rol,id_carrera);
COMMIT;
