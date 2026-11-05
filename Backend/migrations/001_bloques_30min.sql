-- Estandariza bloque_horario a franjas de 30 min (07:00-21:00).
-- Cada clase de horario_clase pasa a ocupar N franjas consecutivas (1 franja = 0.5 h).
-- Los bloques antiguos se redondean a :00/:30 (ej. 08:15-09:45 -> 08:30-10:00).
BEGIN;

CREATE TABLE IF NOT EXISTS bak_bloque_horario_pre30 AS SELECT * FROM bloque_horario;
CREATE TABLE IF NOT EXISTS bak_horario_clase_pre30 AS SELECT * FROM horario_clase;

ALTER TABLE horario_clase DISABLE TRIGGER trg_validar_choque_aula;
ALTER TABLE horario_clase DISABLE TRIGGER trg_validar_choque_docente;

CREATE TEMP TABLE viejos AS SELECT id_bloque, hora_inicio, hora_fin FROM bloque_horario;

INSERT INTO bloque_horario (hora_inicio, hora_fin)
SELECT t::time, (t + INTERVAL '30 minutes')::time
FROM generate_series(TIMESTAMP '2000-01-01 07:00', TIMESTAMP '2000-01-01 20:30', INTERVAL '30 minutes') t;

CREATE TEMP TABLE nuevos AS
SELECT id_bloque, hora_inicio FROM bloque_horario
WHERE id_bloque NOT IN (SELECT id_bloque FROM viejos);

CREATE TEMP TABLE viejos_r AS
SELECT id_bloque,
       (CEIL(EXTRACT(EPOCH FROM hora_inicio) / 1800) * 1800) AS ini_s,
       (CEIL(EXTRACT(EPOCH FROM hora_fin) / 1800) * 1800) AS fin_s
FROM viejos;

INSERT INTO horario_clase (id_grupo, id_aula, id_dia, id_bloque, id_tipo_clase)
SELECT h.id_grupo, h.id_aula, h.id_dia, n.id_bloque, h.id_tipo_clase
FROM horario_clase h
JOIN viejos_r v ON v.id_bloque = h.id_bloque
JOIN nuevos n ON EXTRACT(EPOCH FROM n.hora_inicio) >= v.ini_s AND EXTRACT(EPOCH FROM n.hora_inicio) < v.fin_s
ON CONFLICT (id_grupo, id_dia, id_bloque, id_tipo_clase) DO NOTHING;

-- Las solicitudes apuntan a la primera franja de la clase migrada
UPDATE solicitud_cambio s SET id_horario = (
  SELECT MIN(n.id_horario) FROM horario_clase o
  JOIN horario_clase n ON n.id_grupo = o.id_grupo AND n.id_aula = o.id_aula AND n.id_dia = o.id_dia
       AND n.id_tipo_clase = o.id_tipo_clase AND n.id_bloque NOT IN (SELECT id_bloque FROM viejos)
  WHERE o.id_horario = s.id_horario)
WHERE s.id_horario IN (SELECT id_horario FROM horario_clase WHERE id_bloque IN (SELECT id_bloque FROM viejos));

DELETE FROM horario_clase WHERE id_bloque IN (SELECT id_bloque FROM viejos);
DELETE FROM bloque_horario WHERE id_bloque IN (SELECT id_bloque FROM viejos);

ALTER TABLE horario_clase ENABLE TRIGGER trg_validar_choque_aula;
ALTER TABLE horario_clase ENABLE TRIGGER trg_validar_choque_docente;

COMMIT;
