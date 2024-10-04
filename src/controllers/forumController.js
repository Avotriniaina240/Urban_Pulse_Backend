const { insertPost } = require('../models/postModel');

// Fonction pour gérer l'insertion d'un post
const createPost = async (req, res) => {
  const { title, content, author_id } = req.body;
  try {
    const post = await insertPost(title, content, author_id);
    res.status(201).json({ message: 'Post ajouté avec succès', post });
  } catch (error) {
    console.error('Error inserting post:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
};

module.exports = {
  createPost,
};