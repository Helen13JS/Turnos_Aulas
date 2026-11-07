const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    await client.connect();
    await client.query(fs.readFileSync(path.join(__dirname, '006_estado_docente.sql'), 'utf8'));
    console.log('Migracion 006 aplicada; estado docente disponible.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(error.message);
    process.exitCode = 1;
  } finally { await client.end(); }
})();
