const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedUsers() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Asegurar que existan los catálogos necesarios
    await client.query(`INSERT INTO tipo_documento (sigla, nombre_documento) VALUES ('CI', 'Carnet de Identidad') ON CONFLICT DO NOTHING;`);
    await client.query(`INSERT INTO nacionalidad (nombre_pais) VALUES ('Bolivia') ON CONFLICT DO NOTHING;`);
    await client.query(`INSERT INTO estado_usuario (nombre_estado) VALUES ('Activo') ON CONFLICT DO NOTHING;`);
    await client.query(`INSERT INTO tipo_contrato (nombre_contrato) VALUES ('Planta'), ('Contratado') ON CONFLICT DO NOTHING;`);

    // Asegurar que existan roles
    await client.query(`INSERT INTO rol (nombre_rol) VALUES ('ADMIN'), ('DIRECTOR'), ('DOCENTE') ON CONFLICT DO NOTHING;`);

    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    // === Usuario 1: Admin ===
    const adminPersona = await client.query(`
      INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos)
      VALUES (1, 1, '0000000', 'Admin', 'Sistema')
      ON CONFLICT (nro_documento) DO UPDATE SET nro_documento='0000000'
      RETURNING id_persona;
    `);
    const idAdminPersona = adminPersona.rows[0].id_persona;

    const adminUser = await client.query(`
      INSERT INTO usuario (id_persona, id_estado_usr, email, password_hash)
      VALUES ($1, 1, 'admin@ulas.edu', $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = $2
      RETURNING id_usuario;
    `, [idAdminPersona, passwordHash]);
    const idAdminUser = adminUser.rows[0].id_usuario;

    await client.query(`
      INSERT INTO usuario_rol (id_usuario, id_rol)
      SELECT $1, id_rol FROM rol WHERE nombre_rol = 'ADMIN'
      ON CONFLICT DO NOTHING;
    `, [idAdminUser]);

    console.log(`✅ Admin: admin@ulas.edu / ${password}`);

    // === Usuario 2: Director ===
    const directorPersona = await client.query(`
      INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos)
      VALUES (1, 1, '1111111', 'Maria', 'Gomez')
      ON CONFLICT (nro_documento) DO UPDATE SET nro_documento='1111111'
      RETURNING id_persona;
    `);
    const idDirectorPersona = directorPersona.rows[0].id_persona;

    const directorUser = await client.query(`
      INSERT INTO usuario (id_persona, id_estado_usr, email, password_hash)
      VALUES ($1, 1, 'director@ulas.edu', $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = $2
      RETURNING id_usuario;
    `, [idDirectorPersona, passwordHash]);
    const idDirectorUser = directorUser.rows[0].id_usuario;

    await client.query(`
      INSERT INTO usuario_rol (id_usuario, id_rol)
      SELECT $1, id_rol FROM rol WHERE nombre_rol = 'DIRECTOR'
      ON CONFLICT DO NOTHING;
    `, [idDirectorUser]);

    // Asociar director a carrera si existe
    const carrera = await client.query(`SELECT id_carrera FROM direccion_carrera LIMIT 1;`);
    if (carrera.rows.length > 0) {
      await client.query(`
        INSERT INTO director_carrera (id_persona, id_carrera)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `, [idDirectorPersona, carrera.rows[0].id_carrera]);
    }

    console.log(`✅ Director: director@ulas.edu / ${password}`);

    // === Usuario 3: Docente (Helen) ===
    const docentePersona = await client.query(`
      INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos)
      VALUES (1, 1, '1234567', 'Helen', 'Test')
      ON CONFLICT (nro_documento) DO UPDATE SET nro_documento='1234567'
      RETURNING id_persona;
    `);
    const idDocentePersona = docentePersona.rows[0].id_persona;

    const docenteUser = await client.query(`
      INSERT INTO usuario (id_persona, id_estado_usr, email, password_hash)
      VALUES ($1, 1, 'helen@ulas.edu', $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = $2
      RETURNING id_usuario;
    `, [idDocentePersona, passwordHash]);
    const idDocenteUser = docenteUser.rows[0].id_usuario;

    await client.query(`
      INSERT INTO usuario_rol (id_usuario, id_rol)
      SELECT $1, id_rol FROM rol WHERE nombre_rol = 'DOCENTE'
      ON CONFLICT DO NOTHING;
    `, [idDocenteUser]);

    // Asegurar que la persona esté registrada como docente
    await client.query(`
      INSERT INTO docente (id_persona, id_tipo_contrato)
      SELECT $1, 1
      WHERE NOT EXISTS (SELECT 1 FROM docente WHERE id_persona = $1);
    `, [idDocentePersona]);

    console.log(`✅ Docente: helen@ulas.edu / ${password}`);

    // === Usuario 4: Docente (Marco) ===
    const marcoPersona = await client.query(`
      INSERT INTO persona (id_tipo_doc, id_nacionalidad, nro_documento, nombres, apellidos)
      VALUES (1, 1, '7654321', 'Marco', 'López')
      ON CONFLICT (nro_documento) DO UPDATE SET nro_documento='7654321'
      RETURNING id_persona;
    `);
    const idMarcoPersona = marcoPersona.rows[0].id_persona;

    const marcoUser = await client.query(`
      INSERT INTO usuario (id_persona, id_estado_usr, email, password_hash)
      VALUES ($1, 1, 'marco@ulas.edu', $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = $2
      RETURNING id_usuario;
    `, [idMarcoPersona, passwordHash]);
    const idMarcoUser = marcoUser.rows[0].id_usuario;

    await client.query(`
      INSERT INTO usuario_rol (id_usuario, id_rol)
      SELECT $1, id_rol FROM rol WHERE nombre_rol = 'DOCENTE'
      ON CONFLICT DO NOTHING;
    `, [idMarcoUser]);

    await client.query(`
      INSERT INTO docente (id_persona, id_tipo_contrato)
      SELECT $1, 2
      WHERE NOT EXISTS (SELECT 1 FROM docente WHERE id_persona = $1);
    `, [idMarcoPersona]);

    console.log(`✅ Docente: marco@ulas.edu / ${password}`);

    await client.query('COMMIT');
    console.log('\n🎉 Todos los usuarios creados correctamente.');
    console.log(`📋 Password para todos: ${password}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedUsers();
