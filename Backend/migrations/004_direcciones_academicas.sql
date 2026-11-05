BEGIN;
LOCK TABLE usuario, direccion_carrera, director_carrera IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE IF NOT EXISTS direccion_academica (
  id_direccion SERIAL PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE CHECK (btrim(codigo) <> ''),
  nombre_direccion VARCHAR(150) NOT NULL CHECK (btrim(nombre_direccion) <> '')
);
ALTER TABLE direccion_carrera ADD COLUMN IF NOT EXISTS id_direccion INT REFERENCES direccion_academica(id_direccion);
ALTER TABLE usuario ADD COLUMN IF NOT EXISTS id_direccion INT REFERENCES direccion_academica(id_direccion);
ALTER TABLE director_carrera ADD COLUMN IF NOT EXISTS id_direccion INT REFERENCES direccion_academica(id_direccion);

INSERT INTO direccion_academica(codigo,nombre_direccion) VALUES
  ('TIC','Tecnologías de la Información'),
  ('INF','Informática'),
  ('ELE','Electrónica') ON CONFLICT(codigo) DO NOTHING;

-- Agrupación inicial solicitada: Sistemas/Software en TIC; Informática y
-- Electrónica separadas. No se crean ni fusionan carreras existentes.
UPDATE direccion_carrera c SET id_direccion=d.id_direccion
FROM direccion_academica d
WHERE c.id_direccion IS NULL AND d.codigo = CASE
  WHEN lower(c.nombre_carrera) LIKE '%sistemas%' OR lower(c.nombre_carrera) LIKE '%software%' THEN 'TIC'
  WHEN lower(c.nombre_carrera) LIKE '%inform%tica%' THEN 'INF'
  WHEN lower(c.nombre_carrera) LIKE '%electr%nica%' THEN 'ELE'
END;
-- Cualquier otro programa conserva su alcance hasta agruparlo explícitamente.
INSERT INTO direccion_academica(codigo,nombre_direccion)
SELECT 'CARRERA-' || id_carrera, nombre_carrera FROM direccion_carrera
WHERE id_direccion IS NULL ON CONFLICT(codigo) DO NOTHING;
UPDATE direccion_carrera c SET id_direccion=d.id_direccion FROM direccion_academica d
WHERE c.id_direccion IS NULL AND d.codigo='CARRERA-' || c.id_carrera;
ALTER TABLE direccion_carrera ALTER COLUMN id_direccion SET NOT NULL;

UPDATE director_carrera d SET id_direccion=c.id_direccion
FROM direccion_carrera c WHERE d.id_carrera=c.id_carrera AND d.id_direccion IS NULL;
UPDATE usuario u SET id_direccion=c.id_direccion FROM direccion_carrera c
WHERE u.rol='ROLE_DIRECTOR_CARRERA' AND u.id_carrera=c.id_carrera AND u.id_direccion IS NULL;

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_carrera_coherente;
-- La antigua carrera se mantiene solo como columna de compatibilidad sin autoridad.
UPDATE usuario SET id_carrera=NULL WHERE id_carrera IS NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='usuario'::regclass AND conname='usuario_rol_direccion_coherente') THEN
    ALTER TABLE usuario ADD CONSTRAINT usuario_rol_direccion_coherente CHECK (
      id_carrera IS NULL AND (
        (rol='ROLE_DIRECTOR_CARRERA' AND id_direccion IS NOT NULL) OR
        (rol<>'ROLE_DIRECTOR_CARRERA' AND id_direccion IS NULL)
      )
    );
  END IF;
END $$;
ALTER TABLE director_carrera ALTER COLUMN id_carrera DROP NOT NULL;
ALTER TABLE director_carrera ALTER COLUMN id_direccion SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carrera_direccion ON direccion_carrera(id_direccion);
CREATE INDEX IF NOT EXISTS idx_usuario_direccion ON usuario(id_direccion);
CREATE INDEX IF NOT EXISTS idx_director_direccion ON director_carrera(id_persona,id_direccion);

-- No se modifican ni deshabilitan triggers de aulas, docentes o reservas:
-- la ocupación se valida globalmente por aula/día/bloque/período.
COMMIT;
