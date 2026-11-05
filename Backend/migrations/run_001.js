require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

(async () => {
  const client = await db.getClient();
  try {
    const antes = (await client.query('select count(*)::int n from horario_clase')).rows[0].n;
    await client.query(fs.readFileSync(path.join(__dirname, '001_bloques_30min.sql'), 'utf8'));
    const despues = (await client.query('select count(*)::int n from horario_clase')).rows[0].n;
    const bl = (await client.query('select count(*)::int n, min(hora_inicio) mi, max(hora_fin) ma from bloque_horario')).rows[0];
    console.log({ filasAntes: antes, slotsDespues: despues, bloques: bl });
  } catch (e) {
    console.error('ERROR', e.message);
    await client.query('ROLLBACK').catch(() => {});
    process.exitCode = 1;
  } finally { client.release(); process.exit(); }
})();
