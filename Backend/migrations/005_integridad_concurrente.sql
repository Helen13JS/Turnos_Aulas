-- Serializa escrituras del calendario a nivel facultad, incluidos escritores SQL.
-- Una fila modificada (no solo advisory lock) provoca serialization_failure bajo
-- REPEATABLE READ/SERIALIZABLE cuando la instantanea ya no es vigente.
BEGIN;
LOCK TABLE horario_clase,asignacion_docente,reserva_temporal,grupo_materia,bloque_horario IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS calendario_write_guard (
  id integer PRIMARY KEY CHECK (id=1),
  version bigint NOT NULL DEFAULT 0
);
INSERT INTO calendario_write_guard(id) VALUES(1) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION bloquear_calendario() RETURNS void LANGUAGE plpgsql VOLATILE AS $$
BEGIN
  UPDATE calendario_write_guard SET version=version+1 WHERE id=1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Falta el control transaccional del calendario'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_bloquear_calendario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM bloquear_calendario();
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION validar_integridad_calendario() RETURNS void LANGUAGE plpgsql VOLATILE AS $$
DECLARE conflicto record;
BEGIN
  IF EXISTS (SELECT 1 FROM reserva_temporal r JOIN dia_semana d USING(id_dia)
    WHERE d.nro_dia_iso<>EXTRACT(ISODOW FROM r.fecha_reserva)) THEN
    RAISE EXCEPTION 'La fecha de reserva no corresponde al dia de semana seleccionado';
  END IF;
  SELECT a.id_horario AS primero,b.id_horario AS segundo INTO conflicto
  FROM horario_clase a JOIN grupo_materia ga ON ga.id_grupo=a.id_grupo
  JOIN bloque_horario ba ON ba.id_bloque=a.id_bloque
  JOIN horario_clase b ON b.id_horario>a.id_horario AND b.id_dia=a.id_dia AND b.id_aula=a.id_aula
  JOIN grupo_materia gb ON gb.id_grupo=b.id_grupo AND gb.id_periodo=ga.id_periodo
  JOIN bloque_horario bb ON bb.id_bloque=b.id_bloque
  WHERE ba.hora_inicio<bb.hora_fin AND bb.hora_inicio<ba.hora_fin LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'Choque de aula: horarios % y % se solapan',conflicto.primero,conflicto.segundo; END IF;

  SELECT a.id_horario AS primero,b.id_horario AS segundo INTO conflicto
  FROM horario_clase a JOIN bloque_horario ba ON ba.id_bloque=a.id_bloque
  JOIN horario_clase b ON b.id_horario>a.id_horario AND b.id_dia=a.id_dia AND b.id_grupo=a.id_grupo
  JOIN bloque_horario bb ON bb.id_bloque=b.id_bloque
  WHERE ba.hora_inicio<bb.hora_fin AND bb.hora_inicio<ba.hora_fin LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'Choque de grupo: horarios % y % se solapan',conflicto.primero,conflicto.segundo; END IF;

  SELECT a.id_horario AS primero,b.id_horario AS segundo INTO conflicto
  FROM asignacion_docente da JOIN asignacion_docente db ON db.id_docente=da.id_docente AND db.id_grupo>da.id_grupo
  JOIN grupo_materia ga ON ga.id_grupo=da.id_grupo
  JOIN grupo_materia gb ON gb.id_grupo=db.id_grupo AND gb.id_periodo=ga.id_periodo
  JOIN horario_clase a ON a.id_grupo=ga.id_grupo
  JOIN horario_clase b ON b.id_grupo=gb.id_grupo AND b.id_dia=a.id_dia
  JOIN bloque_horario ba ON ba.id_bloque=a.id_bloque JOIN bloque_horario bb ON bb.id_bloque=b.id_bloque
  WHERE ba.hora_inicio<bb.hora_fin AND bb.hora_inicio<ba.hora_fin LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'Choque de docente: horarios % y % se solapan',conflicto.primero,conflicto.segundo; END IF;

  SELECT h.id_horario,r.id_reserva INTO conflicto
  FROM reserva_temporal r JOIN horario_clase h ON h.id_aula=r.id_aula AND h.id_dia=r.id_dia
  JOIN grupo_materia g ON g.id_grupo=h.id_grupo AND g.id_periodo=r.id_periodo
  JOIN bloque_horario bh ON bh.id_bloque=h.id_bloque JOIN bloque_horario br ON br.id_bloque=r.id_bloque
  WHERE bh.hora_inicio<br.hora_fin AND br.hora_inicio<bh.hora_fin LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'Choque de reserva: el aula ya tiene un horario regular (horario %, reserva %)',conflicto.id_horario,conflicto.id_reserva; END IF;

  SELECT a.id_reserva AS primero,b.id_reserva AS segundo INTO conflicto
  FROM reserva_temporal a JOIN reserva_temporal b ON b.id_reserva>a.id_reserva AND b.id_aula=a.id_aula AND b.fecha_reserva=a.fecha_reserva
  JOIN bloque_horario ba ON ba.id_bloque=a.id_bloque JOIN bloque_horario bb ON bb.id_bloque=b.id_bloque
  WHERE ba.hora_inicio<bb.hora_fin AND bb.hora_inicio<ba.hora_fin LIMIT 1;
  IF FOUND THEN RAISE EXCEPTION 'Choque de reserva: el aula ya esta reservada (reservas % y %)',conflicto.primero,conflicto.segundo; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_integridad_calendario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM validar_integridad_calendario();
  RETURN NULL;
END;
$$;

DO $$
DECLARE tabla text;
BEGIN
  FOREACH tabla IN ARRAY ARRAY['horario_clase','asignacion_docente','reserva_temporal','grupo_materia','bloque_horario'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_00_bloquear_calendario ON %I',tabla);
    EXECUTE format('CREATE TRIGGER trg_00_bloquear_calendario BEFORE INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION trg_bloquear_calendario()',tabla);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_99_integridad_calendario ON %I',tabla);
    EXECUTE format('CREATE TRIGGER trg_99_integridad_calendario AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH STATEMENT EXECUTE FUNCTION trg_integridad_calendario()',tabla);
  END LOOP;
END;
$$;
-- No confirmar la migracion sobre datos que ya incumplen las restricciones.
SELECT validar_integridad_calendario();
COMMIT;
