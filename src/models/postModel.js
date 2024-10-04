const pool = require('../db');

// Fonction pour insérer un post
const insertPost = async (title, content, author_id) => {
  try {
    const result = await pool.query('INSERT INTO forum_posts (title, content, author_id) VALUES ($1, $2, $3) RETURNING *', [title, content, author_id]);
    return result.rows[0]; // Retourne le post inséré
  } catch (error) {
    throw error; // Propagation de l'erreur
  }
};

module.exports = {
  insertPost,
};