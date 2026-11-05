const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
(async () => {
  try {
    await client.connect();
    await client.query(fs.readFileSync(path.join(__dirname, '005_integridad_concurrente.sql'), 'utf8'));
    console.log('Migracion 005 aplicada; integridad del calendario comprobada.');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(error.message);
    process.exitCode = 1;
  } finally { await client.end(); }
})();
