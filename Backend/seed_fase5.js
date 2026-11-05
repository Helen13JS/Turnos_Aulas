const db = require('./src/config/db');

async function seedFase5() {
  try {
    console.log("Iniciando semillero para Fase 5...");
    
    // Catalogos Solicitud
    await db.query(`INSERT INTO tipo_solicitud (nombre_tipo) VALUES ('Cambio Temporal'), ('Cambio Permanente') ON CONFLICT DO NOTHING;`);
    await db.query(`INSERT INTO estado_solicitud (nombre_estado) VALUES ('Pendiente'), ('Aprobada'), ('Rechazada') ON CONFLICT DO NOTHING;`);
    
    // Catalogos Notificacion
    await db.query(`INSERT INTO tipo_notificacion (nombre_tipo) VALUES ('Aprobacion Solicitud'), ('Rechazo Solicitud') ON CONFLICT DO NOTHING;`);
    await db.query(`INSERT INTO estado_notificacion (nombre_estado) VALUES ('Pendiente'), ('Enviada') ON CONFLICT DO NOTHING;`);

    // Persona, Usuario, Docente
    await db.query(`INSERT INTO tipo_documento (sigla, nombre_documento) VALUES ('CI', 'Carnet') ON CONFLICT DO NOTHING;`);
    await db.query(`INSERT INTO nacionalidad (nombre_pais) VALUES ('Bolivia') ON CONFLICT DO NOTHING;`);
    await db.query(`INSERT INTO estado_usuario (nombre_estado) VALUES ('Activo') ON CONFLICT DO NOTHING;`);
    await db.query(`INSERT INTO tipo_contrato (nombre_contrato) VALUES ('Fijo') ON CONFLICT DO NOTHING;`);

    // Insert Persona 1 (Docente)
    const p1 = await db.query(`
      INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos)
      VALUES (1, 1, '1111111', 'Juan', 'Perez')
      ON CONFLICT (nro_documento) DO UPDATE SET nro_documento='1111111'
      RETURNING id_persona;
    `);
    const idPersonaDocente = p1.rows[0].id_persona;
    
    // Insert Usuario Docente
    await db.query(`
      INSERT INTO usuario (id_persona, id_estado_usr, email, password_hash)
      VALUES ($1, 1, 'docente@test.com', 'hash')
      ON CONFLICT (email) DO NOTHING;
    `, [idPersonaDocente]);
    
    // Insert Docente
    await db.query(`
      INSERT INTO docente (id_persona, id_tipo_contrato)
      SELECT $1, 1
      WHERE NOT EXISTS (SELECT 1 FROM docente WHERE id_persona = $1)
    `, [idPersonaDocente]);

    // Insert Persona 2 (Director)
    const p2 = await db.query(`
      INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos)
      VALUES (1, 1, '2222222', 'Maria', 'Gomez')
      ON CONFLICT (nro_documento) DO UPDATE SET nro_documento='2222222'
      RETURNING id_persona;
    `);
    const idPersonaDirector = p2.rows[0].id_persona;
    
    // Insert Director (Necesita id_carrera)
    // Buscamos cualquier carrera o creamos una
    const c1 = await db.query(`
      INSERT INTO direccion_carrera (id_facultad, id_modalidad, nombre_carrera, sigla)
      VALUES ((SELECT COALESCE((SELECT id_facultad FROM facultad LIMIT 1), 1)), (SELECT COALESCE((SELECT id_modalidad FROM modalidad_estudio LIMIT 1), 1)), 'Sistemas', 'SIS')
      ON CONFLICT DO NOTHING RETURNING id_carrera;
    `);
    
    // Intentar buscar id_carrera por si ya existía
    const carreraQ = await db.query('SELECT id_carrera FROM direccion_carrera LIMIT 1');
    const idCarrera = carreraQ.rows.length > 0 ? carreraQ.rows[0].id_carrera : null;

    if (idCarrera) {
      await db.query(`
        INSERT INTO director_carrera (id_persona, id_carrera)
        SELECT $1, $2
        WHERE NOT EXISTS (SELECT 1 FROM director_carrera WHERE id_persona = $1)
      `, [idPersonaDirector, idCarrera]);
    }
    
    console.log("Semillero Fase 5 completado.");
  } catch (error) {
    console.error("Error en seed:", error);
  } finally {
    process.exit(0);
  }
}

seedFase5();
