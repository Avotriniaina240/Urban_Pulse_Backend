const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // requis par Railway pour sécuriser la connexion
  },
});

pool.on('connect', () => {
  console.log('✅ [DB] Connexion PostgreSQL Connectée 🚀');
});

pool.on('remove', () => {
  console.log('[DB] Connexion PostgreSQL fermée.');
});

pool.on('error', (err) => {
  console.error('[DB] Erreur de connexion PostgreSQL :', err.message);
});

module.exports = pool;
