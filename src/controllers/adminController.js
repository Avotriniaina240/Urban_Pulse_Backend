const pool = require('../db');

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
  
    try {
      // Suppression de l'utilisateur dans la base de données
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
  
      // Si aucun utilisateur n'a été supprimé, on retourne un 404
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
  
      // Réponse avec un message de succès
      res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', err.message);
      res.status(500).send('Erreur serveur');
    }
  };