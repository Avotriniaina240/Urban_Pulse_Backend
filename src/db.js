
const { Pool } = require('pg');

// Créez une instance de Pool avec une paramètres de connexion
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'projet_urban_pulse',
  password: 'postgres',
  port: 5432,
});




module.exports = pool;
