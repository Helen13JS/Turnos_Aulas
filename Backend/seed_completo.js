const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seedCompleto() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');

    // Helper: insertar y retornar, o buscar si ya existe
    const upsert = async (table, cols, vals, returning = null) => {
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const conflictCols = cols[0];
      let sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
      if (returning) sql += ` RETURNING ${returning}`;
      const res = await c.query(sql + ';', vals);
      if (returning && res.rows[0]) return res.rows[0][returning];
      // Si no retornó, buscar el registro
      const where = cols.map((col, i) => `${col} = $${i + 1}`).join(' AND ');
      const found = await c.query(`SELECT ${returning || cols[0]} FROM ${table} WHERE ${where} LIMIT 1;`, vals);
      return found.rows[0]?.[returning || cols[0]];
    };

    // Helper: buscar por una columna
    const find = async (table, col, val) => {
      const res = await c.query(`SELECT * FROM ${table} WHERE ${col} = $1 LIMIT 1;`, [val]);
      return res.rows[0] || null;
    };

    // ═══════════════ FASE 1: CATÁLOGOS ═══════════════
    console.log('📦 Fase 1: Catálogos...');

    const idInstitucion = await upsert('institucion', ['nombre', 'sigla'], ['Universidad Mayor Real y Pontificia de San Francisco Xavier', 'USFX'], 'id_institucion');
    console.log(`  Institución: ${idInstitucion}`);

    const idAreaCC = await upsert('area_conocimiento', ['nombre_area'], ['Ciencias de la Computación'], 'id_area');
    const idAreaSI = await upsert('area_conocimiento', ['nombre_area'], ['Sistemas de Información'], 'id_area');
    const idAreaIS = await upsert('area_conocimiento', ['nombre_area'], ['Ingeniería de Software'], 'id_area');
    const idAreaRT = await upsert('area_conocimiento', ['nombre_area'], ['Redes y Telecomunicaciones'], 'id_area');
    console.log(`  Áreas: CC=${idAreaCC}, SI=${idAreaSI}, IS=${idAreaIS}, RT=${idAreaRT}`);

    await upsert('semestre_nivel', ['descripcion'], ['Primer Semestre'], 'id_semestre');
    await upsert('semestre_nivel', ['descripcion'], ['Segundo Semestre'], 'id_semestre');
    await upsert('semestre_nivel', ['descripcion'], ['Tercer Semestre'], 'id_semestre');
    await upsert('semestre_nivel', ['descripcion'], ['Cuarto Semestre'], 'id_semestre');

    await upsert('modalidad_estudio', ['nombre_modalidad'], ['Presencial'], 'id_modalidad');
    await upsert('tipo_aula', ['nombre_tipo'], ['Teórica'], 'id_tipo_espacio');
    await upsert('tipo_aula', ['nombre_tipo'], ['Laboratorio'], 'id_tipo_espacio');
    await upsert('tipo_aula', ['nombre_tipo'], ['Auditorio'], 'id_tipo_espacio');
    await upsert('estado_aula', ['nombre_estado'], ['Disponible'], 'id_estado_espacio');
    await upsert('estado_aula', ['nombre_estado'], ['En mantenimiento'], 'id_estado_espacio');
    await upsert('tipo_documento', ['sigla', 'nombre_documento'], ['CI', 'Carnet de Identidad'], 'id_tipo_doc');
    await upsert('nacionalidad', ['nombre_pais'], ['Bolivia'], 'id_nacionalidad');
    await upsert('estado_usuario', ['nombre_estado'], ['Activo'], 'id_estado_usr');
    await upsert('estado_usuario', ['nombre_estado'], ['Inactivo'], 'id_estado_usr');
    await upsert('tipo_contrato', ['nombre_contrato'], ['Planta'], 'id_tipo_contrato');
    await upsert('tipo_contrato', ['nombre_contrato'], ['Contratado'], 'id_tipo_contrato');
    await upsert('tipo_contrato', ['nombre_contrato'], ['Cátedra'], 'id_tipo_contrato');
    await upsert('rol', ['nombre_rol'], ['ADMIN'], 'id_rol');
    await upsert('rol', ['nombre_rol'], ['DIRECTOR'], 'id_rol');
    await upsert('rol', ['nombre_rol'], ['DOCENTE'], 'id_rol');
    await upsert('estado_grupo', ['nombre_estado'], ['Activo'], 'id_estado_grupo');
    await upsert('tipo_clase', ['nombre_tipo'], ['Teoría'], 'id_tipo_clase');
    await upsert('tipo_clase', ['nombre_tipo'], ['Laboratorio'], 'id_tipo_clase');
    await upsert('tipo_clase', ['nombre_tipo'], ['Práctica'], 'id_tipo_clase');
    await upsert('tipo_solicitud', ['nombre_tipo'], ['Cambio Temporal'], 'id_tipo_sol');
    await upsert('tipo_solicitud', ['nombre_tipo'], ['Cambio Permanente'], 'id_tipo_sol');
    await upsert('estado_solicitud', ['nombre_estado'], ['Pendiente'], 'id_estado_sol');
    await upsert('estado_solicitud', ['nombre_estado'], ['Aprobada'], 'id_estado_sol');
    await upsert('estado_solicitud', ['nombre_estado'], ['Rechazada'], 'id_estado_sol');
    await upsert('tipo_notificacion', ['nombre_tipo'], ['Solicitud'], 'id_tipo_notif');
    await upsert('tipo_notificacion', ['nombre_tipo'], ['Recordatorio'], 'id_tipo_notif');
    await upsert('estado_notificacion', ['nombre_estado'], ['Pendiente'], 'id_estado_notif');
    await upsert('estado_notificacion', ['nombre_estado'], ['Enviada'], 'id_estado_notif');

    // Motivos de excepción
    await upsert('motivo_excepcion', ['descripcion'], ['Feriado nacional']);
    await upsert('motivo_excepcion', ['descripcion'], ['Evento académico']);
    await upsert('motivo_excepcion', ['descripcion'], ['Mantenimiento de aula']);

    // Periodo
    await c.query(`INSERT INTO periodo_academico (gestion, fecha_inicio, fecha_fin, activo) VALUES ('2026-I', '2026-03-01', '2026-07-31', true) ON CONFLICT DO NOTHING;`);
    const periodo = (await c.query(`SELECT id_periodo FROM periodo_academico WHERE activo = TRUE LIMIT 1;`)).rows[0];

    // Días
    await c.query(`INSERT INTO dia_semana (nombre_dia, nro_dia_iso) VALUES ('Lunes', 1), ('Martes', 2), ('Miércoles', 3), ('Jueves', 4), ('Viernes', 5), ('Sábado', 6) ON CONFLICT (nro_dia_iso) DO NOTHING;`);

    // Bloques
    await c.query(`INSERT INTO bloque_horario (hora_inicio, hora_fin) VALUES ('07:00', '09:00'), ('09:00', '11:00'), ('11:00', '13:00'), ('14:30', '16:30'), ('16:30', '18:30'), ('18:30', '20:30') ON CONFLICT DO NOTHING;`);

    console.log('  ✅ Catálogos listos');

    // ═══════════════ FASE 2: ESTRUCTURA FÍSICA ═══════════════
    console.log('📦 Fase 2: Estructura física...');

    const idCampus = await upsert('campus', ['id_institucion', 'nombre_campus', 'direccion'], [idInstitucion, 'Campus Central', 'Av. Universitaria s/n'], 'id_campus');
    console.log(`  Campus: ${idCampus}`);

    const idFacTec = await upsert('facultad', ['id_campus', 'nombre_facultad'], [idCampus, 'Facultad de Tecnología'], 'id_facultad');
    const idFacCie = await upsert('facultad', ['id_campus', 'nombre_facultad'], [idCampus, 'Facultad de Ciencias'], 'id_facultad');
    console.log(`  Facultades: Tec=${idFacTec}, Cie=${idFacCie}`);

    // Pabellones
    const idPabA = await upsert('pabellon', ['id_facultad', 'nombre_pabellon'], [idFacTec, 'Pabellón A'], 'id_pabellon');
    const idPabB = await upsert('pabellon', ['id_facultad', 'nombre_pabellon'], [idFacTec, 'Pabellón B'], 'id_pabellon');
    const idPabC = await upsert('pabellon', ['id_facultad', 'nombre_pabellon'], [idFacTec, 'Pabellón C'], 'id_pabellon');
    console.log(`  Pabellones: A=${idPabA}, B=${idPabB}, C=${idPabC}`);

    // Pisos
    const pisos = [];
    for (const [idPab, nums] of [[idPabA, [1, 2]], [idPabB, [1, 2]], [idPabC, [1, 2, 3]]]) {
      for (const n of nums) {
        const id = await upsert('piso', ['id_pabellon', 'numero_piso', 'descripcion'], [idPab, n, `Piso ${n}`], 'id_piso');
        pisos.push({ id, pabellon: idPab, num: n });
      }
    }
    console.log(`  ${pisos.length} pisos creados`);

    // Aulas
    const getPiso = (pab, num) => pisos.find(p => p.pabellon === pab && p.num === num)?.id;

    const aulasData = [
      [getPiso(idPabA, 1), 'Aula A-101', 40], [getPiso(idPabA, 1), 'Aula A-102', 35], [getPiso(idPabA, 1), 'Aula A-103', 45],
      [getPiso(idPabA, 2), 'Aula A-201', 50], [getPiso(idPabA, 2), 'Aula A-202', 40],
      [getPiso(idPabB, 1), 'Lab B-101', 30], [getPiso(idPabB, 1), 'Lab B-102', 30], [getPiso(idPabB, 1), 'Lab B-103', 35],
      [getPiso(idPabB, 2), 'Lab B-201', 25], [getPiso(idPabB, 2), 'Lab B-202', 25],
      [getPiso(idPabC, 1), 'Aula C-101', 60], [getPiso(idPabC, 1), 'Aula C-102', 55], [getPiso(idPabC, 1), 'Aula C-103', 50],
      [getPiso(idPabC, 2), 'Aula C-201', 70], [getPiso(idPabC, 2), 'Aula C-202', 65], [getPiso(idPabC, 2), 'Aula C-203', 60],
      [getPiso(idPabC, 3), 'Auditorio C-301', 120], [getPiso(idPabC, 3), 'Sala C-302', 40],
    ];

    for (const [pisoId, nombre, cap] of aulasData) {
      if (!pisoId) continue;
      await c.query(`INSERT INTO aula (id_piso, id_tipo_espacio, id_estado_espacio, nombre_codigo, capacidad_maxima) VALUES ($1, 1, 1, $2, $3) ON CONFLICT (nombre_codigo) DO NOTHING;`, [pisoId, nombre, cap]);
    }
    console.log(`  ${aulasData.length} aulas creadas`);

    // ═══════════════ FASE 3: CARRERAS, PLANES, MATERIAS ═══════════════
    console.log('📦 Fase 3: Académico...');

    const idModalidad = (await c.query(`SELECT id_modalidad FROM modalidad_estudio LIMIT 1;`)).rows[0]?.id_modalidad;

    const idCarrSIS = await upsert('direccion_carrera', ['id_facultad', 'id_modalidad', 'nombre_carrera', 'sigla'], [idFacTec, idModalidad, 'Ingeniería de Sistemas', 'SIS'], 'id_carrera');
    const idCarrELE = await upsert('direccion_carrera', ['id_facultad', 'id_modalidad', 'nombre_carrera', 'sigla'], [idFacTec, idModalidad, 'Ingeniería Electrónica', 'ELE'], 'id_carrera');
    const idCarrINF = await upsert('direccion_carrera', ['id_facultad', 'id_modalidad', 'nombre_carrera', 'sigla'], [idFacCie, idModalidad, 'Licenciatura en Informática', 'INF'], 'id_carrera');
    console.log(`  Carreras: SIS=${idCarrSIS}, ELE=${idCarrELE}, INF=${idCarrINF}`);

    // Planes
    const idPlanSIS = await upsert('plan_estudio', ['id_carrera', 'nombre_plan', 'resolucion', 'vigente'], [idCarrSIS, 'Plan 2026', 'RES-2026-01', true], 'id_plan');
    const idPlanELE = await upsert('plan_estudio', ['id_carrera', 'nombre_plan', 'resolucion', 'vigente'], [idCarrELE, 'Plan 2026', 'RES-2026-02', true], 'id_plan');
    const idPlanINF = await upsert('plan_estudio', ['id_carrera', 'nombre_plan', 'resolucion', 'vigente'], [idCarrINF, 'Plan 2026', 'RES-2026-03', true], 'id_plan');

    // Materias: [sigla, nombre, id_area]
    const materias = [
      ['CI-101', 'Introducción a la Programación', idAreaCC], ['CI-102', 'Programación Orientada a Objetos', idAreaCC],
      ['SIS-200', 'Sistemas Operativos', idAreaSI], ['SIS-201', 'Base de Datos I', idAreaSI],
      ['SIS-202', 'Redes de Computadoras', idAreaRT], ['SIS-203', 'Ingeniería de Software', idAreaIS],
      ['SIS-300', 'Administración de Redes', idAreaRT], ['SIS-301', 'Sistemas Distribuidos', idAreaSI],
      ['ELE-101', 'Circuitos Eléctricos', idAreaCC], ['ELE-201', 'Electrónica Analógica', idAreaCC],
      ['ELE-202', 'Electrónica Digital', idAreaCC], ['ELE-301', 'Microcontroladores', idAreaIS],
      ['INF-101', 'Lógica Computacional', idAreaCC], ['INF-201', 'Estructuras de Datos', idAreaSI],
      ['INF-202', 'Compiladores', idAreaSI], ['INF-301', 'Inteligencia Artificial', idAreaIS],
    ];

    const materiaIds = {};
    for (const [sigla, nombre, areaId] of materias) {
      // Buscar por sigla primero (es UNIQUE)
      let found = (await c.query(`SELECT id_materia FROM materia WHERE sigla = $1 LIMIT 1;`, [sigla])).rows[0];
      if (found) {
        materiaIds[sigla] = found.id_materia;
      } else {
        const res = await c.query(`INSERT INTO materia (id_area, nombre_materia, sigla) VALUES ($1, $2, $3) RETURNING id_materia;`, [areaId, nombre, sigla]);
        materiaIds[sigla] = res.rows[0]?.id_materia;
      }
    }

    // Asignar materias a planes
    const semestre1 = (await c.query(`SELECT id_semestre FROM semestre_nivel WHERE descripcion LIKE 'Primer%' LIMIT 1;`)).rows[0]?.id_semestre;
    const semestre2 = (await c.query(`SELECT id_semestre FROM semestre_nivel WHERE descripcion LIKE 'Segundo%' LIMIT 1;`)).rows[0]?.id_semestre;
    const semestre3 = (await c.query(`SELECT id_semestre FROM semestre_nivel WHERE descripcion LIKE 'Tercer%' LIMIT 1;`)).rows[0]?.id_semestre;

    const planMaterias = [
      [idPlanSIS, 'CI-101', semestre1], [idPlanSIS, 'CI-102', semestre1],
      [idPlanSIS, 'SIS-200', semestre2], [idPlanSIS, 'SIS-201', semestre2],
      [idPlanSIS, 'SIS-202', semestre2], [idPlanSIS, 'SIS-203', semestre2],
      [idPlanSIS, 'SIS-300', semestre3], [idPlanSIS, 'SIS-301', semestre3],
      [idPlanELE, 'ELE-101', semestre1], [idPlanELE, 'ELE-201', semestre2],
      [idPlanELE, 'ELE-202', semestre2], [idPlanELE, 'ELE-301', semestre3],
      [idPlanINF, 'INF-101', semestre1], [idPlanINF, 'INF-201', semestre2],
      [idPlanINF, 'INF-202', semestre2], [idPlanINF, 'INF-301', semestre3],
    ];

    for (const [planId, sigla, semId] of planMaterias) {
      await c.query(`INSERT INTO materia_plan (id_materia, id_plan, id_semestre) VALUES ($1, $2, $3) ON CONFLICT (id_materia, id_plan) DO NOTHING;`, [materiaIds[sigla], planId, semId]);
    }

    // Carga horaria
    const tipoTeoria = (await c.query(`SELECT id_tipo_clase FROM tipo_clase WHERE nombre_tipo = 'Teoría' LIMIT 1;`)).rows[0]?.id_tipo_clase;
    const tipoLab = (await c.query(`SELECT id_tipo_clase FROM tipo_clase WHERE nombre_tipo = 'Laboratorio' LIMIT 1;`)).rows[0]?.id_tipo_clase;

    for (const sigla of Object.keys(materiaIds)) {
      await c.query(`INSERT INTO materia_carga_horaria (id_materia, id_tipo_clase, horas_semana) VALUES ($1, $2, 4) ON CONFLICT DO NOTHING;`, [materiaIds[sigla], tipoTeoria]);
      if (sigla.startsWith('SIS') || sigla.startsWith('ELE') || sigla === 'INF-201' || sigla === 'INF-301') {
        await c.query(`INSERT INTO materia_carga_horaria (id_materia, id_tipo_clase, horas_semana) VALUES ($1, $2, 2) ON CONFLICT DO NOTHING;`, [materiaIds[sigla], tipoLab]);
      }
    }
    console.log(`  ${Object.keys(materiaIds).length} materias creadas`);

    // ═══════════════ FASE 4: PERSONAS, USUARIOS, DOCENTES ═══════════════
    console.log('📦 Fase 4: Personas y docentes...');

    const passwordHash = await bcrypt.hash('password123', 10);
    const idTipoDoc = (await c.query(`SELECT id_tipo_doc FROM tipo_documento WHERE sigla = 'CI' LIMIT 1;`)).rows[0]?.id_tipo_doc;
    const idNac = (await c.query(`SELECT id_nacionalidad FROM nacionalidad WHERE nombre_pais = 'Bolivia' LIMIT 1;`)).rows[0]?.id_nacionalidad;
    const idEstActivo = (await c.query(`SELECT id_estado_usr FROM estado_usuario WHERE nombre_estado = 'Activo' LIMIT 1;`)).rows[0]?.id_estado_usr;
    const idRolDoc = (await c.query(`SELECT id_rol FROM rol WHERE nombre_rol = 'DOCENTE' LIMIT 1;`)).rows[0]?.id_rol;
    const idRolDir = (await c.query(`SELECT id_rol FROM rol WHERE nombre_rol = 'DIRECTOR' LIMIT 1;`)).rows[0]?.id_rol;
    const idRolAdmin = (await c.query(`SELECT id_rol FROM rol WHERE nombre_rol = 'ADMIN' LIMIT 1;`)).rows[0]?.id_rol;

    // Permisos RBAC
    console.log('  Creando permisos RBAC...');
    const permisosData = [
      ['CREAR_HORARIO', 'Crear horarios de clase'],
      ['ELIMINAR_HORARIO', 'Eliminar horarios de clase'],
      ['CREAR_RESERVA', 'Crear reservas temporales'],
      ['ELIMINAR_RESERVA', 'Eliminar reservas temporales'],
      ['ASIGNAR_DOCENTE', 'Asignar docentes a grupos'],
      ['GESTIONAR_GRUPO', 'Crear grupos de materia'],
      ['GESTIONAR_PERIODO', 'Crear y editar períodos académicos'],
      ['GESTIONAR_MATERIA', 'Crear materias'],
    ];
    for (const [codigo, nombre] of permisosData) {
      const idPerm = await upsert('permiso', ['codigo_accion', 'nombre_permiso'], [codigo, nombre], 'id_permiso');
      await c.query('INSERT INTO rol_permiso (id_rol, id_permiso) VALUES ($1, $2) ON CONFLICT DO NOTHING;', [idRolAdmin, idPerm]);
    }
    console.log(`  ✅ ${permisosData.length} permisos creados y asignados al rol ADMIN`);

    const getOrCreateTipoContrato = async (nombre) => {
      const r = await c.query(`SELECT id_tipo_contrato FROM tipo_contrato WHERE nombre_contrato = $1 LIMIT 1;`, [nombre]);
      return r.rows[0]?.id_tipo_contrato;
    };

    const crearUsuario = async (nroDoc, nombres, apellidos, email, rol, contrato) => {
      const per = await c.query(`INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (nro_documento) DO UPDATE SET nombres=$4, apellidos=$5 RETURNING id_persona;`, [idTipoDoc, idNac, nroDoc, nombres, apellidos]);
      const idPer = per.rows[0].id_persona;
      const usr = await c.query(`INSERT INTO usuario (id_persona, id_estado_usr, email, password_hash) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET password_hash=$4 RETURNING id_usuario;`, [idPer, idEstActivo, email, passwordHash]);
      const idUsr = usr.rows[0].id_usuario;
      await c.query(`INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [idUsr, rol]);
      const idTC = await getOrCreateTipoContrato(contrato);
      const doc = await c.query(`INSERT INTO docente (id_persona, id_tipo_contrato) SELECT $1, $2 WHERE NOT EXISTS (SELECT 1 FROM docente WHERE id_persona = $1) RETURNING id_docente;`, [idPer, idTC]);
      let idDoc = doc.rows[0]?.id_docente;
      if (!idDoc) idDoc = (await c.query(`SELECT id_docente FROM docente WHERE id_persona = $1;`, [idPer])).rows[0]?.id_docente;
      return { idPer, idUsr, idDoc };
    };

    const docentes = [];
    const docenteData = [
      ['1000001', 'Carlos', 'Mendoza', 'carlos@ulas.edu', 'DOCENTE', 'Planta'],
      ['1000002', 'María', 'López', 'maria.lopez@ulas.edu', 'DOCENTE', 'Planta'],
      ['1000003', 'Roberto', 'García', 'roberto@ulas.edu', 'DOCENTE', 'Contratado'],
      ['1000004', 'Ana', 'Martínez', 'ana@ulas.edu', 'DOCENTE', 'Planta'],
      ['1000005', 'Luis', 'Torres', 'luis@ulas.edu', 'DOCENTE', 'Cátedra'],
      ['1000006', 'Patricia', 'Ramírez', 'patricia@ulas.edu', 'DOCENTE', 'Planta'],
      ['1000007', 'Fernando', 'Cruz', 'fernando@ulas.edu', 'DOCENTE', 'Contratado'],
      ['1000008', 'Claudia', 'Vargas', 'claudia@ulas.edu', 'DOCENTE', 'Planta'],
    ];

    for (const [nro, nom, ape, email, rol, contrato] of docenteData) {
      const d = await crearUsuario(nro, nom, ape, email, idRolDoc, contrato);
      docentes.push(d);
    }

    // Director
    const dir = await crearUsuario('2000001', 'Jorge', 'Suárez', 'director@ulas.edu', idRolDir, 'Planta');
    await c.query(`INSERT INTO director_carrera (id_persona, id_carrera) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [dir.idPer, idCarrSIS]);

    // Admin
    const adminPer = await c.query(`INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos) VALUES ($1, $2, '9999999', 'Admin', 'Sistema') ON CONFLICT (nro_documento) DO UPDATE SET nombres='Admin' RETURNING id_persona;`, [idTipoDoc, idNac]);
    const adminUsr = await c.query(`INSERT INTO usuario (id_persona, id_estado_usr, email, password_hash) VALUES ($1, $2, 'admin@ulas.edu', $3) ON CONFLICT (email) DO UPDATE SET password_hash=$3 RETURNING id_usuario;`, [adminPer.rows[0].id_persona, idEstActivo, passwordHash]);
    await c.query(`INSERT INTO usuario_rol (id_usuario, id_rol) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [adminUsr.rows[0].id_usuario, idRolAdmin]);

    // Asociar docentes a carreras
    const carreras = [idCarrSIS, idCarrELE, idCarrINF];
    for (let i = 0; i < docentes.length; i++) {
      await c.query(`INSERT INTO docente_carrera (id_docente, id_carrera) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [docentes[i].idDoc, carreras[i % carreras.length]]);
    }
    console.log(`  ✅ ${docentes.length} docentes + admin + director`);

    // ═══════════════ FASE 5: GRUPOS Y ASIGNACIONES ═══════════════
    console.log('📦 Fase 5: Grupos y asignaciones...');

    const grupos = [];
    const materiasParaGrupos = [
      ['SIS-200', idPlanSIS], ['SIS-201', idPlanSIS], ['SIS-202', idPlanSIS], ['SIS-203', idPlanSIS], ['CI-101', idPlanSIS],
      ['ELE-201', idPlanELE], ['ELE-202', idPlanELE],
      ['INF-201', idPlanINF], ['INF-202', idPlanINF],
    ];

    for (const [sigla, planId] of materiasParaGrupos) {
      const mp = (await c.query(`SELECT id_mat_plan FROM materia_plan WHERE id_materia = $1 AND id_plan = $2;`, [materiaIds[sigla], planId])).rows[0];
      if (!mp) continue;
      const g = await c.query(`INSERT INTO grupo_materia (id_mat_plan, id_periodo, id_estado_grupo, nombre_grupo) VALUES ($1, $2, 1, 'G1') ON CONFLICT (id_mat_plan, id_periodo, nombre_grupo) DO NOTHING RETURNING id_grupo;`, [mp.id_mat_plan, periodo.id_periodo]);
      let idGrupo = g.rows[0]?.id_grupo;
      if (!idGrupo) idGrupo = (await c.query(`SELECT id_grupo FROM grupo_materia WHERE id_mat_plan = $1 AND id_periodo = $2 AND nombre_grupo = 'G1';`, [mp.id_mat_plan, periodo.id_periodo])).rows[0]?.id_grupo;
      if (idGrupo) grupos.push({ sigla, idGrupo });
    }

    // Asignar docentes a grupos
    for (let i = 0; i < grupos.length; i++) {
      const doc = docentes[i % docentes.length];
      if (doc?.idDoc) await c.query(`INSERT INTO asignacion_docente (id_grupo, id_docente) VALUES ($1, $2) ON CONFLICT DO NOTHING;`, [grupos[i].idGrupo, doc.idDoc]);
    }
    console.log(`  ✅ ${grupos.length} grupos creados`);

    // ═══════════════ FASE 6: HORARIOS DE CLASE ═══════════════
    console.log('📦 Fase 6: Horarios de clase...');

    const dias = (await c.query(`SELECT id_dia, nombre_dia FROM dia_semana ORDER BY nro_dia_iso;`)).rows;
    const bloques = (await c.query(`SELECT id_bloque, hora_inicio, hora_fin FROM bloque_horario ORDER BY hora_inicio;`)).rows;
    const aulas = (await c.query(`SELECT id_aula, nombre_codigo FROM aula ORDER BY nombre_codigo;`)).rows;

    const ocupado = new Set();
    let horariosAsignados = 0;

    const horariosPlan = [
      { sigla: 'SIS-200', dias: [0, 2], bloque: 0, aula: 'Aula C-201' },
      { sigla: 'SIS-201', dias: [1, 3], bloque: 1, aula: 'Aula C-202' },
      { sigla: 'SIS-202', dias: [0, 2], bloque: 2, aula: 'Lab B-101' },
      { sigla: 'SIS-203', dias: [1, 3], bloque: 3, aula: 'Aula C-101' },
      { sigla: 'CI-101',  dias: [0, 2, 4], bloque: 0, aula: 'Aula A-101' },
      { sigla: 'ELE-201', dias: [1, 3], bloque: 2, aula: 'Aula A-201' },
      { sigla: 'ELE-202', dias: [0, 2], bloque: 3, aula: 'Lab B-201' },
      { sigla: 'INF-201', dias: [1, 3], bloque: 0, aula: 'Aula C-102' },
      { sigla: 'INF-202', dias: [0, 4], bloque: 1, aula: 'Lab B-102' },
    ];

    for (const h of horariosPlan) {
      const grupo = grupos.find((g) => g.sigla === h.sigla);
      if (!grupo) continue;
      const aulaRow = aulas.find((a) => a.nombre_codigo === h.aula);
      if (!aulaRow) continue;

      for (const diaIdx of h.dias) {
        const dia = dias[diaIdx];
        const bloque = bloques[h.bloque];
        if (!dia || !bloque) continue;

        const key = `${dia.id_dia}-${bloque.id_bloque}-${aulaRow.nombre_codigo}`;
        if (ocupado.has(key)) continue;
        ocupado.add(key);

        const tipoClase = h.aula.startsWith('Lab') ? tipoLab : tipoTeoria;
        await c.query(`INSERT INTO horario_clase (id_grupo, id_aula, id_dia, id_bloque, id_tipo_clase) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id_grupo, id_dia, id_bloque, id_tipo_clase) DO NOTHING;`, [grupo.idGrupo, aulaRow.id_aula, dia.id_dia, bloque.id_bloque, tipoClase]);
        horariosAsignados++;
      }
    }
    console.log(`  ✅ ${horariosAsignados} horarios de clase`);

    await c.query('COMMIT');
    console.log('\n🎉 ¡Seed completo ejecutado correctamente!');
    console.log(`\n📋 USUARIOS PARA LOGIN (password: password123):`);
    console.log(`   admin@ulas.edu`);
    console.log(`   director@ulas.edu`);
    console.log(`   carlos@ulas.edu`);
    console.log(`   maria.lopez@ulas.edu`);
    console.log(`   roberto@ulas.edu`);
    console.log(`   ana@ulas.edu`);
    console.log(`   luis@ulas.edu`);
    console.log(`   patricia@ulas.edu`);
    console.log(`   fernando@ulas.edu`);
    console.log(`   claudia@ulas.edu`);
  } catch (error) {
    await c.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    c.release();
    await pool.end();
  }
}

seedCompleto();
