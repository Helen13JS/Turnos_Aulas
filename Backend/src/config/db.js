// Backend/src/config/db.js
const { Pool } = require('pg');
const config = require('./index');

if (!config.dbUrl) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

const pool = new Pool({
  connectionString: config.dbUrl,
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: async () => await pool.connect(),
};
