const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function upsertInstitutionScheduleData() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const seedInstitution = `
      INSERT INTO institucion (nombre, sigla)
      VALUES ('Universidad de la Tecnología', 'UTEC')
      ON CONFLICT DO NOTHING
      RETURNING id_institucion;
    `;
    const institutionRes = await client.query(seedInstitution);
    const idInstitucion =
      institutionRes.rows[0]?.id_institucion ||
      (await client.query(`SELECT id_institucion FROM institucion WHERE sigla = 'UTEC' LIMIT 1;`)).rows[0].id_institucion;

    await client.query(`
      INSERT INTO campus (id_institucion, nombre_campus, direccion)
      VALUES ($1, 'Campus Central', 'Av. Principal 1234')
      ON CONFLICT DO NOTHING;
    `, [idInstitucion]);

    const campusRes = await client.query(`SELECT id_campus FROM campus WHERE nombre_campus = 'Campus Central' LIMIT 1;`);
    const idCampus = campusRes.rows[0].id_campus;

    await client.query(`
      INSERT INTO facultad (id_campus, nombre_facultad)
      VALUES ($1, 'Facultad de Ingeniería')
      ON CONFLICT DO NOTHING;
    `, [idCampus]);

    const facultadRes = await client.query(`SELECT id_facultad FROM facultad WHERE nombre_facultad = 'Facultad de Ingeniería' LIMIT 1;`);
    const idFacultad = facultadRes.rows[0].id_facultad;

    await client.query(`
      INSERT INTO modalidad_estudio (nombre_modalidad)
      VALUES ('Presencial')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO direccion_carrera (id_facultad, id_modalidad, nombre_carrera, sigla)
      VALUES ($1, 1, 'Ingeniería de Sistemas', 'SIS')
      ON CONFLICT (id_facultad, sigla) DO NOTHING;
    `, [idFacultad]);

    const carreraRes = await client.query(`SELECT id_carrera FROM direccion_carrera WHERE sigla = 'SIS' LIMIT 1;`);
    const idCarrera = carreraRes.rows[0].id_carrera;

    await client.query(`
      INSERT INTO plan_estudio (id_carrera, nombre_plan, resolucion, vigente)
      VALUES ($1, 'Plan 2026', 'RES-2026-01', true)
      ON CONFLICT (id_carrera, nombre_plan) DO NOTHING;
    `, [idCarrera]);

    const planRes = await client.query(`SELECT id_plan FROM plan_estudio WHERE nombre_plan = 'Plan 2026' LIMIT 1;`);
    const idPlan = planRes.rows[0].id_plan;

    const areaInsert = await client.query(`
      INSERT INTO area_conocimiento (nombre_area)
      VALUES ('Ciencias de la Computación'), ('Sistemas de Información')
      ON CONFLICT DO NOTHING;
    `);

    const areaCompu = await client.query(`SELECT id_area FROM area_conocimiento WHERE nombre_area = 'Ciencias de la Computación' LIMIT 1;`);
    const areaSistemas = await client.query(`SELECT id_area FROM area_conocimiento WHERE nombre_area = 'Sistemas de Información' LIMIT 1;`);
    const idAreaComputacion = areaCompu.rows[0]?.id_area || 1;
    const idAreaSistemas = areaSistemas.rows[0]?.id_area || 2;

    await client.query(`
      INSERT INTO semestre_nivel (descripcion)
      VALUES ('Primer Semestre'), ('Segundo Semestre'), ('Tercer Semestre')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO estado_grupo (nombre_estado)
      VALUES ('Activo')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO tipo_clase (nombre_tipo)
      VALUES ('Teoría'), ('Laboratorio')
      ON CONFLICT (nombre_tipo) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO periodo_academico (gestion, fecha_inicio, fecha_fin, activo)
      VALUES ('2026-I', '2026-03-01', '2026-07-31', true)
      ON CONFLICT DO NOTHING;
    `);

    const periodoRes = await client.query(`SELECT id_periodo FROM periodo_academico WHERE gestion = '2026-I' LIMIT 1;`);
    const idPeriodo = periodoRes.rows[0].id_periodo;

    const dayRows = await client.query(`
      INSERT INTO dia_semana (nombre_dia, nro_dia_iso)
      VALUES ('Lunes', 1), ('Martes', 2), ('Miércoles', 3), ('Jueves', 4), ('Viernes', 5), ('Sábado', 6)
      ON CONFLICT (nro_dia_iso) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO bloque_horario (hora_inicio, hora_fin)
      VALUES ('07:00', '09:00'), ('09:00', '11:00'), ('11:00', '13:00')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO tipo_aula (nombre_tipo)
      VALUES ('Teórica'), ('Laboratorio')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO estado_aula (nombre_estado)
      VALUES ('Disponible'), ('Ocupada')
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO pabellon (id_facultad, nombre_pabellon)
      VALUES ($1, 'Pabellón C')
      ON CONFLICT DO NOTHING;
    `, [idFacultad]);

    const pabellonRes = await client.query(`SELECT id_pabellon FROM pabellon WHERE nombre_pabellon = 'Pabellón C' LIMIT 1;`);
    const idPabellon = pabellonRes.rows[0].id_pabellon;

    await client.query(`
      INSERT INTO piso (id_pabellon, numero_piso, descripcion)
      VALUES ($1, 1, 'Primer piso')
      ON CONFLICT (id_pabellon, numero_piso) DO NOTHING;
    `, [idPabellon]);

    const pisoRes = await client.query(`SELECT id_piso FROM piso WHERE id_pabellon = $1 AND numero_piso = 1 LIMIT 1;`, [idPabellon]);
    const idPiso = pisoRes.rows[0].id_piso;

    const aulas = [
      ['Aula 101', 40], ['Aula 102', 35], ['Aula 103', 45],
      ['Aula 201', 50], ['Aula 202', 44], ['Aula 203', 30],
      ['Aula 301', 60], ['Aula 302', 52], ['Aula 303', 48],
    ];

    for (const [nombre, capacidad] of aulas) {
      await client.query(`
        INSERT INTO aula (id_piso, id_tipo_espacio, id_estado_espacio, nombre_codigo, capacidad_maxima)
        VALUES ($1, 1, 1, $2, $3)
        ON CONFLICT (nombre_codigo) DO NOTHING;
      `, [idPiso, nombre, capacidad]);
    }

    const materias = [
      ['SIS-200', 'Sistemas Operativos'],
      ['SIS-201', 'Dinámica de Sistemas'],
      ['SIS-202', 'Redes'],
    ];

    for (const [sigla, nombreMateria] of materias) {
      const areaId = sigla.includes('201') || sigla.includes('202') ? idAreaSistemas : idAreaComputacion;

      const matRes = await client.query(`
        INSERT INTO materia (id_area, nombre_materia, sigla)
        VALUES ($1, $2, $3)
        ON CONFLICT (sigla) DO NOTHING
        RETURNING id_materia;
      `, [areaId, nombreMateria, sigla]);

      const idMateria = matRes.rows[0]?.id_materia || (await client.query(`SELECT id_materia FROM materia WHERE sigla = $1 LIMIT 1;`, [sigla])).rows[0].id_materia;

      await client.query(`
        INSERT INTO materia_plan (id_materia, id_plan, id_semestre)
        VALUES ($1, $2, 1)
        ON CONFLICT (id_materia, id_plan) DO NOTHING;
      `, [idMateria, idPlan]);
    }

    const getOrCreateTipoDoc = async (sigla, nombre) => {
      const existing = await client.query(`SELECT id_tipo_doc FROM tipo_documento WHERE sigla = $1 LIMIT 1;`, [sigla]);
      if (existing.rows[0]) return existing.rows[0].id_tipo_doc;
      const inserted = await client.query(`INSERT INTO tipo_documento (sigla, nombre_documento) VALUES ($1, $2) RETURNING id_tipo_doc;`, [sigla, nombre]);
      return inserted.rows[0].id_tipo_doc;
    };

    const getOrCreateNacionalidad = async (nombre) => {
      const existing = await client.query(`SELECT id_nacionalidad FROM nacionalidad WHERE nombre_pais = $1 LIMIT 1;`, [nombre]);
      if (existing.rows[0]) return existing.rows[0].id_nacionalidad;
      const inserted = await client.query(`INSERT INTO nacionalidad (nombre_pais) VALUES ($1) RETURNING id_nacionalidad;`, [nombre]);
      return inserted.rows[0].id_nacionalidad;
    };

    const getOrCreateEstadoUsuario = async (nombre) => {
      const existing = await client.query(`SELECT id_estado_usr FROM estado_usuario WHERE nombre_estado = $1 LIMIT 1;`, [nombre]);
      if (existing.rows[0]) return existing.rows[0].id_estado_usr;
      const inserted = await client.query(`INSERT INTO estado_usuario (nombre_estado) VALUES ($1) RETURNING id_estado_usr;`, [nombre]);
      return inserted.rows[0].id_estado_usr;
    };

    const getOrCreateTipoContrato = async (nombre) => {
      const existing = await client.query(`SELECT id_tipo_contrato FROM tipo_contrato WHERE nombre_contrato = $1 LIMIT 1;`, [nombre]);
      if (existing.rows[0]) return existing.rows[0].id_tipo_contrato;
      const inserted = await client.query(`INSERT INTO tipo_contrato (nombre_contrato) VALUES ($1) RETURNING id_tipo_contrato;`, [nombre]);
      return inserted.rows[0].id_tipo_contrato;
    };

    const idTipoDocCI = await getOrCreateTipoDoc('CI', 'Carnet de Identidad');
    const idNacionalidad = await getOrCreateNacionalidad('Bolivia');
    const idEstadoUsuario = await getOrCreateEstadoUsuario('Activo');
    const idTipoContrato = await getOrCreateTipoContrato('Planta');

    const docenteSeedData = [
      { nro_documento: '1234567', nombres: 'Helen', apellidos: 'Test', fecha_nacimiento: '1988-05-12' },
      { nro_documento: '7654321', nombres: 'Marco', apellidos: 'López', fecha_nacimiento: '1985-10-20' },
    ];

    const docenteRows = [];
    for (const persona of docenteSeedData) {
      let idPersona = (await client.query(`SELECT id_persona FROM persona WHERE nro_documento = $1 LIMIT 1;`, [persona.nro_documento])).rows[0]?.id_persona;

      if (!idPersona) {
        const personaRes = await client.query(`
          INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos, fecha_nacimiento)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id_persona;
        `, [idTipoDocCI, idNacionalidad, persona.nro_documento, persona.nombres, persona.apellidos, persona.fecha_nacimiento]);
        idPersona = personaRes.rows[0].id_persona;
      }

      let idDocente = (await client.query(`SELECT id_docente FROM docente WHERE id_persona = $1 LIMIT 1;`, [idPersona])).rows[0]?.id_docente;
      if (!idDocente) {
        const docenteRes = await client.query(`
          INSERT INTO docente (id_persona, id_tipo_contrato)
          VALUES ($1, $2)
          RETURNING id_docente;
        `, [idPersona, idTipoContrato]);
        idDocente = docenteRes.rows[0].id_docente;
      }

      docenteRows.push({ idDocente, nombre: persona.nombres, nro: persona.nro_documento });
    }

    for (const { idDocente } of docenteRows) {
      await client.query(`
        INSERT INTO docente_carrera (id_docente, id_carrera)
        VALUES ($1, $2)
        ON CONFLICT (id_docente, id_carrera) DO NOTHING;
      `, [idDocente, idCarrera]);
    }

    const grupoMap = {};
    const grupoIds = await client.query(`SELECT id_mat_plan, id_mat_plan FROM materia_plan WHERE id_plan = $1;`, [idPlan]);
    for (const [index, item] of grupoIds.rows.entries()) {
      const idMatPlan = item.id_mat_plan;
      const sigla = (await client.query(`SELECT sigla FROM materia WHERE id_materia = (SELECT id_materia FROM materia_plan WHERE id_mat_plan = $1) LIMIT 1;`, [idMatPlan])).rows[0]?.sigla;
      if (sigla) {
        const grupoRes = await client.query(`
          INSERT INTO grupo_materia (id_mat_plan, id_periodo, id_estado_grupo, nombre_grupo)
          VALUES ($1, $2, 1, $3)
          ON CONFLICT (id_mat_plan, id_periodo, nombre_grupo) DO NOTHING
          RETURNING id_grupo;
        `, [idMatPlan, idPeriodo, `G${index + 1}`]);

        const idGrupo = grupoRes.rows[0]?.id_grupo || (await client.query(`SELECT id_grupo FROM grupo_materia WHERE id_mat_plan = $1 AND id_periodo = $2 AND nombre_grupo = $3 LIMIT 1;`, [idMatPlan, idPeriodo, `G${index + 1}`])).rows[0].id_grupo;
        grupoMap[sigla] = idGrupo;
      }
    }

    const docentes = docenteRows.map(({ idDocente }) => idDocente);
    for (const [sigla, idGrupo] of Object.entries(grupoMap)) {
      const doc = docentes.shift() || docentes[0];
      if (doc) {
        await client.query(`
          INSERT INTO asignacion_docente (id_grupo, id_docente)
          VALUES ($1, $2)
          ON CONFLICT (id_grupo, id_docente) DO NOTHING;
        `, [idGrupo, doc]);
      }
    }

    const aulaIds = await client.query(`SELECT id_aula, nombre_codigo FROM aula ORDER BY id_aula LIMIT 9;`);
    const dias = await client.query(`SELECT id_dia, nombre_dia FROM dia_semana ORDER BY nro_dia_iso;`);
    const bloques = await client.query(`SELECT id_bloque, hora_inicio, hora_fin FROM bloque_horario ORDER BY hora_inicio;`);
    const tiposClase = await client.query(`SELECT id_tipo_clase, nombre_tipo FROM tipo_clase ORDER BY id_tipo_clase;`);

    const scheduleAssignments = [
      { sigla: 'SIS-200', dia: 'Lunes', bloque: 1, aula: 'Aula 301', tipo: 'Teoría' },
      { sigla: 'SIS-201', dia: 'Martes', bloque: 2, aula: 'Aula 302', tipo: 'Teoría' },
      { sigla: 'SIS-202', dia: 'Miércoles', bloque: 3, aula: 'Aula 303', tipo: 'Laboratorio' },
      { sigla: 'SIS-200', dia: 'Jueves', bloque: 1, aula: 'Aula 201', tipo: 'Teoría' },
      { sigla: 'SIS-202', dia: 'Viernes', bloque: 2, aula: 'Aula 202', tipo: 'Laboratorio' },
      { sigla: 'SIS-201', dia: 'Sábado', bloque: 3, aula: 'Aula 203', tipo: 'Teoría' },
    ];

    for (const assignment of scheduleAssignments) {
      const idGrupo = grupoMap[assignment.sigla];
      if (!idGrupo) continue;
      const dia = dias.rows.find((d) => d.nombre_dia === assignment.dia);
      const bloque = bloques.rows[assignment.bloque - 1];
      const aula = aulaIds.rows.find((a) => a.nombre_codigo === assignment.aula);
      const tipoClaseId = tiposClase.rows.find((t) => t.nombre_tipo === (assignment.tipo === 'Laboratorio' ? 'Laboratorio' : 'Teoría'))?.id_tipo_clase;

      if (dia && bloque && aula && tipoClaseId) {
        await client.query(`
          INSERT INTO horario_clase (id_grupo, id_aula, id_dia, id_bloque, id_tipo_clase)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id_grupo, id_dia, id_bloque, id_tipo_clase) DO NOTHING;
        `, [idGrupo, aula.id_aula, dia.id_dia, bloque.id_bloque, tipoClaseId]);
      }
    }

    await client.query('COMMIT');
    console.log('✅ Datos de prueba de institución y horarios insertados correctamente.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error al insertar datos de prueba:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

upsertInstitutionScheduleData();
