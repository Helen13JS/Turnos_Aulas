CREATE TABLE institucion (
    id_institucion  SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    sigla           VARCHAR(20)
);

CREATE TABLE area_conocimiento (
    id_area         SERIAL PRIMARY KEY,
    nombre_area     VARCHAR(100) NOT NULL
);

CREATE TABLE semestre_nivel (
    id_semestre     SERIAL PRIMARY KEY,
    descripcion     VARCHAR(50) NOT NULL
);

CREATE TABLE modalidad_estudio (
    id_modalidad      SERIAL PRIMARY KEY,
    nombre_modalidad  VARCHAR(50) NOT NULL
);

CREATE TABLE tipo_aula (
    id_tipo_espacio SERIAL PRIMARY KEY,
    nombre_tipo     VARCHAR(50) NOT NULL
);

CREATE TABLE estado_aula (
    id_estado_espacio SERIAL PRIMARY KEY,
    nombre_estado     VARCHAR(50) NOT NULL
);

CREATE TABLE tipo_recurso (
    id_tipo_recurso SERIAL PRIMARY KEY,
    nombre_tipo     VARCHAR(50) NOT NULL
);

CREATE TABLE tipo_mantenimiento (
    id_tipo_mant    SERIAL PRIMARY KEY,
    nombre_tipo     VARCHAR(50) NOT NULL
);

CREATE TABLE estado_mantenimiento (
    id_estado_mant  SERIAL PRIMARY KEY,
    nombre_estado   VARCHAR(50) NOT NULL
);

CREATE TABLE tipo_documento (
    id_tipo_doc       SERIAL PRIMARY KEY,
    sigla             VARCHAR(10) NOT NULL,
    nombre_documento  VARCHAR(50) NOT NULL
);

CREATE TABLE nacionalidad (
    id_nacionalidad SERIAL PRIMARY KEY,
    nombre_pais     VARCHAR(50) NOT NULL
);

CREATE TABLE rol (
    id_rol      SERIAL PRIMARY KEY,
    nombre_rol  VARCHAR(50) NOT NULL
);

CREATE TABLE permiso (
    id_permiso      SERIAL PRIMARY KEY,
    nombre_permiso  VARCHAR(100) NOT NULL,
    codigo_accion   VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE estado_usuario (
    id_estado_usr SERIAL PRIMARY KEY,
    nombre_estado VARCHAR(50) NOT NULL
);

CREATE TABLE tipo_contrato (
    id_tipo_contrato SERIAL PRIMARY KEY,
    nombre_contrato  VARCHAR(50) NOT NULL
);

CREATE TABLE periodo_academico (
    id_periodo    SERIAL PRIMARY KEY,
    gestion       VARCHAR(20) NOT NULL,
    fecha_inicio  DATE,
    fecha_fin     DATE,
    activo        BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE dia_semana (
    id_dia      SERIAL PRIMARY KEY,
    nombre_dia  VARCHAR(20) NOT NULL,
    nro_dia_iso SMALLINT NOT NULL UNIQUE
);

CREATE TABLE bloque_horario (
    id_bloque     SERIAL PRIMARY KEY,
    hora_inicio   TIME NOT NULL,
    hora_fin      TIME NOT NULL,
    CHECK (hora_fin > hora_inicio)
);

CREATE TABLE estado_grupo (
    id_estado_grupo SERIAL PRIMARY KEY,
    nombre_estado   VARCHAR(50) NOT NULL
);

CREATE TABLE tipo_clase (
    id_tipo_clase SERIAL PRIMARY KEY,
    nombre_tipo   VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE motivo_excepcion (
    id_motivo_excep SERIAL PRIMARY KEY,
    descripcion     VARCHAR(100) NOT NULL
);

CREATE TABLE tipo_solicitud (
    id_tipo_sol SERIAL PRIMARY KEY,
    nombre_tipo VARCHAR(50) NOT NULL
);

CREATE TABLE estado_solicitud (
    id_estado_sol SERIAL PRIMARY KEY,
    nombre_estado VARCHAR(50) NOT NULL
);

CREATE TABLE motivo_rechazo (
    id_motivo_rechazo SERIAL PRIMARY KEY,
    descripcion        VARCHAR(150) NOT NULL
);

CREATE TABLE tipo_notificacion (
    id_tipo_notif SERIAL PRIMARY KEY,
    nombre_tipo   VARCHAR(50) NOT NULL
);

CREATE TABLE estado_notificacion (
    id_estado_notif SERIAL PRIMARY KEY,
    nombre_estado   VARCHAR(50) NOT NULL
);

CREATE TABLE tarea_programada (
    id_tarea        SERIAL PRIMARY KEY,
    nombre_tarea    VARCHAR(100) NOT NULL,
    frecuencia_ejecucion  VARCHAR(50) NOT NULL
);

CREATE TABLE campus (
    id_campus      SERIAL PRIMARY KEY,
    id_institucion INT NOT NULL REFERENCES institucion(id_institucion),
    nombre_campus  VARCHAR(100) NOT NULL,
    direccion      VARCHAR(200)
);

CREATE TABLE facultad (
    id_facultad      SERIAL PRIMARY KEY,
    id_campus        INT NOT NULL REFERENCES campus(id_campus),
    nombre_facultad  VARCHAR(150) NOT NULL
);

CREATE TABLE direccion_carrera (
    id_carrera     SERIAL PRIMARY KEY,
    id_facultad    INT NOT NULL REFERENCES facultad(id_facultad),
    id_modalidad   INT NOT NULL REFERENCES modalidad_estudio(id_modalidad),
    nombre_carrera VARCHAR(150) NOT NULL,
    sigla          VARCHAR(10),
    UNIQUE (id_facultad, sigla)
);

CREATE TABLE plan_estudio (
    id_plan      SERIAL PRIMARY KEY,
    id_carrera   INT NOT NULL REFERENCES direccion_carrera(id_carrera),
    nombre_plan  VARCHAR(50) NOT NULL,
    resolucion   VARCHAR(100),
    vigente      BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_carrera, nombre_plan)
);

CREATE TABLE materia (
    id_materia      SERIAL PRIMARY KEY,
    id_area         INT NOT NULL REFERENCES area_conocimiento(id_area),
    nombre_materia  VARCHAR(150) NOT NULL,
    sigla           VARCHAR(20) UNIQUE
);

CREATE TABLE materia_carga_horaria (
    id_carga      SERIAL PRIMARY KEY,
    id_materia    INT NOT NULL REFERENCES materia(id_materia),
    id_tipo_clase INT NOT NULL REFERENCES tipo_clase(id_tipo_clase),
    horas_semana  SMALLINT NOT NULL CHECK (horas_semana > 0),
    UNIQUE (id_materia, id_tipo_clase)
);

CREATE TABLE materia_plan (
    id_mat_plan  SERIAL PRIMARY KEY,
    id_materia   INT NOT NULL REFERENCES materia(id_materia),
    id_plan      INT NOT NULL REFERENCES plan_estudio(id_plan),
    id_semestre  INT NOT NULL REFERENCES semestre_nivel(id_semestre),
    UNIQUE (id_materia, id_plan)
);

CREATE TABLE prerequisito_materia (
    id_prerequisito SERIAL PRIMARY KEY,
    id_mat_plan     INT NOT NULL REFERENCES materia_plan(id_mat_plan),
    id_mat_req      INT NOT NULL REFERENCES materia_plan(id_mat_plan),
    CHECK (id_mat_plan <> id_mat_req),
    UNIQUE (id_mat_plan, id_mat_req)
);

CREATE TABLE pabellon (
    id_pabellon     SERIAL PRIMARY KEY,
    id_facultad     INT NOT NULL REFERENCES facultad(id_facultad),
    nombre_pabellon VARCHAR(100) NOT NULL
);

CREATE TABLE piso (
    id_piso      SERIAL PRIMARY KEY,
    id_pabellon  INT NOT NULL REFERENCES pabellon(id_pabellon),
    numero_piso  INT NOT NULL,
    descripcion  VARCHAR(50),
    UNIQUE (id_pabellon, numero_piso)
);

CREATE TABLE aula (
    id_aula            SERIAL PRIMARY KEY,
    id_piso            INT NOT NULL REFERENCES piso(id_piso),
    id_tipo_espacio    INT NOT NULL REFERENCES tipo_aula(id_tipo_espacio),
    id_estado_espacio  INT NOT NULL REFERENCES estado_aula(id_estado_espacio),
    nombre_codigo      VARCHAR(50) NOT NULL UNIQUE,
    capacidad_maxima   INT NOT NULL CHECK (capacidad_maxima > 0),
    coord_x            DECIMAL(10,4),
    coord_y            DECIMAL(10,4)
);

CREATE TABLE aula_carrera (
    id_aula_carrera SERIAL PRIMARY KEY,
    id_aula         INT NOT NULL REFERENCES aula(id_aula),
    id_carrera      INT NOT NULL REFERENCES direccion_carrera(id_carrera),
    es_compartida   BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (id_aula, id_carrera)
);

CREATE TABLE recurso (
    id_recurso      SERIAL PRIMARY KEY,
    id_tipo_recurso INT NOT NULL REFERENCES tipo_recurso(id_tipo_recurso),
    nro_serie       VARCHAR(100) UNIQUE,
    descripcion     VARCHAR(150)
);

CREATE TABLE recurso_aula (
    id_rec_aula       SERIAL PRIMARY KEY,
    id_recurso        INT NOT NULL REFERENCES recurso(id_recurso),
    id_aula           INT NOT NULL REFERENCES aula(id_aula),
    fecha_asignacion  DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (id_recurso, id_aula)
);

CREATE TABLE mantenimiento_aula (
    id_mantenimiento SERIAL PRIMARY KEY,
    id_aula          INT NOT NULL REFERENCES aula(id_aula),
    id_tipo_mant     INT NOT NULL REFERENCES tipo_mantenimiento(id_tipo_mant),
    id_estado_mant   INT NOT NULL REFERENCES estado_mantenimiento(id_estado_mant),
    fecha_inicio     DATE NOT NULL,
    fecha_fin        DATE,
    observacion      TEXT,
    CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE TABLE persona (
    id_persona        SERIAL PRIMARY KEY,
    id_tipo_doc       INT NOT NULL REFERENCES tipo_documento(id_tipo_doc),
    id_nacionalidad   INT NOT NULL REFERENCES nacionalidad(id_nacionalidad),
    nro_documento     VARCHAR(50) UNIQUE NOT NULL,
    nombres           VARCHAR(100) NOT NULL,
    apellidos         VARCHAR(100) NOT NULL,
    fecha_nacimiento  DATE
);

CREATE TABLE usuario (
    id_usuario      SERIAL PRIMARY KEY,
    id_persona      INT NOT NULL REFERENCES persona(id_persona),
    id_estado_usr   INT NOT NULL REFERENCES estado_usuario(id_estado_usr),
    email           VARCHAR(150) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    fecha_creacion  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rol_permiso (
    id_rol_permiso SERIAL PRIMARY KEY,
    id_rol         INT NOT NULL REFERENCES rol(id_rol),
    id_permiso     INT NOT NULL REFERENCES permiso(id_permiso),
    UNIQUE (id_rol, id_permiso)
);

CREATE TABLE usuario_rol (
    id_usuario_rol SERIAL PRIMARY KEY,
    id_usuario     INT NOT NULL REFERENCES usuario(id_usuario),
    id_rol         INT NOT NULL REFERENCES rol(id_rol),
    UNIQUE (id_usuario, id_rol)
);

CREATE TABLE sesion_jwt (
    id_sesion         SERIAL PRIMARY KEY,
    id_usuario        INT NOT NULL REFERENCES usuario(id_usuario),
    token_jti         VARCHAR(255) UNIQUE NOT NULL,
    fecha_expiracion  TIMESTAMP NOT NULL,
    es_revocado       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE auditoria_acceso (
    id_auditoria SERIAL PRIMARY KEY,
    id_usuario   INT NOT NULL REFERENCES usuario(id_usuario),
    fecha_hora   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_acceso    VARCHAR(50),
    accion       VARCHAR(100)
);

CREATE TABLE estudiante (
    id_estudiante SERIAL PRIMARY KEY,
    id_persona    INT NOT NULL REFERENCES persona(id_persona),
    id_carrera    INT NOT NULL REFERENCES direccion_carrera(id_carrera),
    matricula     VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE docente (
    id_docente        SERIAL PRIMARY KEY,
    id_persona        INT NOT NULL REFERENCES persona(id_persona),
    id_tipo_contrato  INT NOT NULL REFERENCES tipo_contrato(id_tipo_contrato)
);

CREATE TABLE docente_carrera (
    id_doc_car  SERIAL PRIMARY KEY,
    id_docente  INT NOT NULL REFERENCES docente(id_docente),
    id_carrera  INT NOT NULL REFERENCES direccion_carrera(id_carrera),
    UNIQUE (id_docente, id_carrera)
);

CREATE TABLE director_carrera (
    id_director     SERIAL PRIMARY KEY,
    id_persona      INT NOT NULL REFERENCES persona(id_persona),
    id_carrera      INT NOT NULL REFERENCES direccion_carrera(id_carrera),
    fecha_posesion  DATE
);

CREATE TABLE grupo_materia (
    id_grupo         SERIAL PRIMARY KEY,
    id_mat_plan      INT NOT NULL REFERENCES materia_plan(id_mat_plan),
    id_periodo       INT NOT NULL REFERENCES periodo_academico(id_periodo),
    id_estado_grupo  INT NOT NULL REFERENCES estado_grupo(id_estado_grupo),
    nombre_grupo     VARCHAR(20) NOT NULL,
    UNIQUE (id_mat_plan, id_periodo, nombre_grupo)
);

CREATE TABLE asignacion_docente (
    id_asig_doc SERIAL PRIMARY KEY,
    id_grupo    INT NOT NULL REFERENCES grupo_materia(id_grupo),
    id_docente  INT NOT NULL REFERENCES docente(id_docente),
    UNIQUE (id_grupo, id_docente)
);

CREATE TABLE inscripcion (
    id_inscripcion      SERIAL PRIMARY KEY,
    id_estudiante       INT NOT NULL REFERENCES estudiante(id_estudiante),
    id_grupo             INT NOT NULL REFERENCES grupo_materia(id_grupo),
    fecha_inscripcion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_estudiante, id_grupo)
);

CREATE TABLE horario_clase (
    id_horario     SERIAL PRIMARY KEY,
    id_grupo       INT NOT NULL REFERENCES grupo_materia(id_grupo),
    id_aula        INT NOT NULL REFERENCES aula(id_aula),
    id_dia         INT NOT NULL REFERENCES dia_semana(id_dia),
    id_bloque      INT NOT NULL REFERENCES bloque_horario(id_bloque),
    id_tipo_clase  INT NOT NULL REFERENCES tipo_clase(id_tipo_clase),
    UNIQUE (id_grupo, id_dia, id_bloque, id_tipo_clase)
);

CREATE TABLE reserva_temporal (
    id_reserva      SERIAL PRIMARY KEY,
    id_director     INT NOT NULL REFERENCES director_carrera(id_director),
    id_aula         INT NOT NULL REFERENCES aula(id_aula),
    id_periodo      INT NOT NULL REFERENCES periodo_academico(id_periodo),
    id_dia          INT NOT NULL REFERENCES dia_semana(id_dia),
    id_bloque       INT NOT NULL REFERENCES bloque_horario(id_bloque),
    fecha_reserva   DATE NOT NULL,
    motivo          VARCHAR(200),
    creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE excepcion_horario (
    id_excepcion     SERIAL PRIMARY KEY,
    id_horario       INT NOT NULL REFERENCES horario_clase(id_horario),
    id_motivo_excep  INT NOT NULL REFERENCES motivo_excepcion(id_motivo_excep),
    fecha_exacta     DATE NOT NULL,
    UNIQUE (id_horario, fecha_exacta)
);

CREATE TABLE feriado (
    id_feriado     SERIAL PRIMARY KEY,
    id_periodo     INT NOT NULL REFERENCES periodo_academico(id_periodo),
    fecha_feriado  DATE NOT NULL,
    descripcion    VARCHAR(100),
    UNIQUE (id_periodo, fecha_feriado)
);

CREATE TABLE solicitud_cambio (
    id_solicitud      SERIAL PRIMARY KEY,
    id_docente        INT NOT NULL REFERENCES docente(id_docente),
    id_horario        INT NOT NULL REFERENCES horario_clase(id_horario),
    id_tipo_sol       INT NOT NULL REFERENCES tipo_solicitud(id_tipo_sol),
    id_estado_sol     INT NOT NULL REFERENCES estado_solicitud(id_estado_sol),
    aula_solicitada   INT REFERENCES aula(id_aula),
    fecha_solicitud   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    justificacion     TEXT
);

CREATE TABLE historial_aprobacion (
    id_historial_sol    SERIAL PRIMARY KEY,
    id_solicitud        INT NOT NULL REFERENCES solicitud_cambio(id_solicitud),
    id_director         INT NOT NULL REFERENCES director_carrera(id_director),
    id_motivo_rechazo   INT REFERENCES motivo_rechazo(id_motivo_rechazo),
    fecha_resolucion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plantilla_correo (
    id_plantilla   SERIAL PRIMARY KEY,
    id_tipo_notif  INT NOT NULL REFERENCES tipo_notificacion(id_tipo_notif),
    asunto         VARCHAR(150) NOT NULL,
    cuerpo_html    TEXT NOT NULL
);

CREATE TABLE registro_notificacion (
    id_registro_notif  SERIAL PRIMARY KEY,
    id_tipo_notif      INT NOT NULL REFERENCES tipo_notificacion(id_tipo_notif),
    fecha_generacion   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE destinatario_notificacion (
    id_destinatario     SERIAL PRIMARY KEY,
    id_registro_notif   INT NOT NULL REFERENCES registro_notificacion(id_registro_notif),
    id_usuario          INT NOT NULL REFERENCES usuario(id_usuario),
    id_estado_notif     INT NOT NULL REFERENCES estado_notificacion(id_estado_notif),
    fecha_envio         TIMESTAMP,
    UNIQUE (id_registro_notif, id_usuario)
);

CREATE TABLE historial_tarea_programada (
    id_historial_cron  SERIAL PRIMARY KEY,
    id_tarea           INT NOT NULL REFERENCES tarea_programada(id_tarea),
    fecha_ejecucion    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resultado          TEXT
);

CREATE TABLE log_sistema (
    id_log           SERIAL PRIMARY KEY,
    id_usuario       INT REFERENCES usuario(id_usuario),
    tabla_afectada   VARCHAR(50),
    operacion        VARCHAR(20),
    fecha_hora       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    detalle          JSONB
);

-- ============================================================================
-- FUNCIONES Y TRIGGERS DE VALIDACION DE CHOQUES
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_validar_choque_aula()
RETURNS TRIGGER AS $$
DECLARE
    v_periodo_nuevo INT;
    v_conflicto     INT;
BEGIN
    SELECT id_periodo INTO v_periodo_nuevo
    FROM grupo_materia WHERE id_grupo = NEW.id_grupo;

    SELECT COUNT(*) INTO v_conflicto
    FROM horario_clase h
    JOIN grupo_materia g ON g.id_grupo = h.id_grupo
    WHERE h.id_aula   = NEW.id_aula
      AND h.id_dia    = NEW.id_dia
      AND h.id_bloque = NEW.id_bloque
      AND g.id_periodo = v_periodo_nuevo
      AND h.id_horario <> COALESCE(NEW.id_horario, -1);

    IF v_conflicto > 0 THEN
        RAISE EXCEPTION 'Choque de aula: ya existe una clase asignada a esta aula en ese dia, bloque y gestion academica.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_choque_aula
BEFORE INSERT OR UPDATE ON horario_clase
FOR EACH ROW EXECUTE FUNCTION fn_validar_choque_aula();


CREATE OR REPLACE FUNCTION fn_validar_choque_docente()
RETURNS TRIGGER AS $$
DECLARE
    v_periodo_nuevo INT;
    v_conflicto     INT;
BEGIN
    SELECT id_periodo INTO v_periodo_nuevo
    FROM grupo_materia WHERE id_grupo = NEW.id_grupo;

    SELECT COUNT(*) INTO v_conflicto
    FROM horario_clase h
    JOIN grupo_materia g       ON g.id_grupo = h.id_grupo
    JOIN asignacion_docente ad ON ad.id_grupo = h.id_grupo
    WHERE ad.id_docente IN (
              SELECT id_docente FROM asignacion_docente WHERE id_grupo = NEW.id_grupo
          )
      AND h.id_dia     = NEW.id_dia
      AND h.id_bloque  = NEW.id_bloque
      AND g.id_periodo = v_periodo_nuevo
      AND h.id_horario <> COALESCE(NEW.id_horario, -1)
      AND h.id_aula    <> NEW.id_aula;

    IF v_conflicto > 0 THEN
        RAISE EXCEPTION 'Choque de docente: el docente ya tiene otra clase asignada en ese dia y bloque, en otra aula.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_choque_docente
BEFORE INSERT OR UPDATE ON horario_clase
FOR EACH ROW EXECUTE FUNCTION fn_validar_choque_docente();


CREATE OR REPLACE FUNCTION fn_validar_choque_reserva()
RETURNS TRIGGER AS $$
DECLARE
    v_conflicto_horario INT;
    v_conflicto_reserva INT;
BEGIN
    SELECT COUNT(*) INTO v_conflicto_horario
    FROM horario_clase h
    JOIN grupo_materia g ON g.id_grupo = h.id_grupo
    WHERE h.id_aula    = NEW.id_aula
      AND h.id_dia     = NEW.id_dia
      AND h.id_bloque  = NEW.id_bloque
      AND g.id_periodo = NEW.id_periodo;

    IF v_conflicto_horario > 0 THEN
        RAISE EXCEPTION 'Choque de reserva: el aula ya tiene un horario regular asignado en ese dia y bloque.';
    END IF;

    SELECT COUNT(*) INTO v_conflicto_reserva
    FROM reserva_temporal r
    WHERE r.id_aula        = NEW.id_aula
      AND r.id_dia         = NEW.id_dia
      AND r.id_bloque      = NEW.id_bloque
      AND r.fecha_reserva  = NEW.fecha_reserva
      AND r.id_reserva     <> COALESCE(NEW.id_reserva, -1);

    IF v_conflicto_reserva > 0 THEN
        RAISE EXCEPTION 'Choque de reserva: el aula ya esta reservada para esa fecha, dia y bloque.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_choque_reserva
BEFORE INSERT OR UPDATE ON reserva_temporal
FOR EACH ROW EXECUTE FUNCTION fn_validar_choque_reserva();
