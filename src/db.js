
const { Pool } = require('pg');

// Créez une instance de Pool avec une paramètres de connexion
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Projet_urban_pulse',
  password: 'chris06',
  port: 5432,
});




module.exports = pool;
