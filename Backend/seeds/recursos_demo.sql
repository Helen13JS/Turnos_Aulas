-- Equipamiento de demostracion: tres recursos por aula, identificados por serie DEMO.
-- Reejecutable: conserva recursos existentes y no duplica series ni asociaciones.
BEGIN;
LOCK TABLE tipo_recurso, recurso, recurso_aula IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE demo_equipos ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('PROYECTOR', 'Proyector', 'Proyector multimedia'),
  ('PIZARRA', 'Pizarra', 'Pizarra acrílica'),
  ('SONIDO', 'Sonido', 'Sistema de sonido')
) AS equipos(codigo, tipo, descripcion);

INSERT INTO tipo_recurso (nombre_tipo)
SELECT d.tipo FROM demo_equipos d
WHERE NOT EXISTS (SELECT 1 FROM tipo_recurso t WHERE LOWER(t.nombre_tipo) = LOWER(d.tipo));

INSERT INTO recurso (id_tipo_recurso, nro_serie, descripcion)
SELECT (SELECT MIN(t.id_tipo_recurso) FROM tipo_recurso t WHERE LOWER(t.nombre_tipo) = LOWER(d.tipo)),
       'DEMO-AULA-' || a.id_aula || '-' || d.codigo,
       d.descripcion
FROM aula a CROSS JOIN demo_equipos d
ON CONFLICT (nro_serie) DO NOTHING;

INSERT INTO recurso_aula (id_recurso, id_aula)
SELECT r.id_recurso, a.id_aula
FROM aula a CROSS JOIN demo_equipos d
JOIN recurso r ON r.nro_serie = 'DEMO-AULA-' || a.id_aula || '-' || d.codigo
ON CONFLICT (id_recurso, id_aula) DO NOTHING;
COMMIT;

SELECT a.id_aula, a.nombre_codigo, COUNT(ra.id_rec_aula)::INT AS recursos,
       ARRAY_AGG(r.descripcion ORDER BY r.descripcion) AS equipamiento
FROM aula a
LEFT JOIN recurso_aula ra USING (id_aula)
LEFT JOIN recurso r USING (id_recurso)
GROUP BY a.id_aula, a.nombre_codigo
ORDER BY a.id_aula;
