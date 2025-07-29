const pool = require('../db');

exports.createReport = async (description, location, image, status, user_id) => {
  const result = await pool.query(
    'INSERT INTO reports (description, location, image, status, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [description, location, image ? image.path : null, status, user_id]
  );
  return result.rows[0];
};

exports.getAllReports = async () => {
  const result = await pool.query('SELECT * FROM reports');
  return result.rows;
};