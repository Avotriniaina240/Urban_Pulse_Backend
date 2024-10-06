const pool = require('../db');

exports.addComment = async (req, res) => {
    const { discussionId, text } = req.body;
  
    if (!discussionId || !text) {
      return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
    }
  
    try {
      // Requête pour insérer un commentaire dans la base de données
      const result = await pool.query(
        'INSERT INTO comments (discussion_id, text) VALUES ($1, $2) RETURNING *',
        [discussionId, text]
      );
  
      // Réponse avec le commentaire ajouté
      res.status(201).json({ message: 'Commentaire ajouté avec succès', comment: result.rows[0] });
    } catch (err) {
      console.error('Erreur lors de l\'ajout du commentaire:', err.message);
      res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du commentaire.' });
    }
  };