const pool = require('../db');

exports.createReport = async (description, location, image, status) => {
  const result = await pool.query(
    'INSERT INTO reports (description, location, image, status) VALUES ($1, $2, $3, $4) RETURNING *',
    [description, location, image ? image.path : null, status]
  );
  return result.rows[0];
};