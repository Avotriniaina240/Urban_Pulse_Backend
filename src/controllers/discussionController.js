const pool = require('../db');

// Fonction pour créer une nouvelle discussion
const createDiscussion = async (req, res) => {
  const { title, description, category, content, userId } = req.body; // Inclure userId

  // Vérification des champs requis
  if (!title || !description || !category || !content || !userId) {
    return res.status(400).json({ error: 'Titre, description, catégorie, contenu et utilisateur sont requis.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO discussions (title, description, category, content, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, category, content, userId] // Ajouter userId ici
    );
    res.status(201).json(result.rows[0]); // Renvoie la discussion créée
  } catch (error) {
    console.error('Erreur lors de la création de la discussion:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la discussion.' });
  }
};

module.exports = { createDiscussion };