
const { Pool } = require('pg');

// Créez une instance de Pool avec une paramètres de connexion
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'projet_urban_pulse',
  password: 'postgres',
  port: 5432,
});

// Gestion des événements du pool
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
