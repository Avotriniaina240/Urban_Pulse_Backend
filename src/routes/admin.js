const express = require('express');
const router = express.Router();
const { deleteUser } = require('../controllers/adminController'); // Import du contrôleur
const authenticateToken = require('../middlewares/authenticateToken'); // Middleware d'authentification
const checkRole = require('../middlewares/checkRole');

router.delete('/admin/users/:id', authenticateToken, checkRole(['admin']), deleteUser);

// Route pour récupérer les informations d'un utilisateur par authorId
router.get('/:authorId', async (req, res) => {
    try {
      const { authorId } = req.params;
      const { rows } = await pool.query('SELECT username FROM users WHERE id = $1', [authorId]); // Remplacez 'users' et 'username' par les noms appropriés
  
      if (rows.length > 0) {
        res.status(200).json(rows[0]); // Renvoie le nom d'utilisateur
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Route pour récupérer les informations d'un utilisateur spécifique
  router.get('/api/admin/users/:id', authenticateToken, async (req, res) => {
    const userId = req.params.id;
  
    try {
      // Requête pour récupérer l'utilisateur en fonction de l'ID depuis la base de données
      const user = await User.findByPk(userId); // Sequelize: 'findByPk' pour trouver par clé primaire
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
  
      // Retourne les informations de l'utilisateur sans exposer des informations sensibles
      const { id, username, email, phone_number, address, date_of_birth } = user;
  
      res.json({
        id,
        username,
        email,
        phone_number,
        address,
        date_of_birth,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erreur serveur lors de la récupération des données utilisateur' });
    }
  }); 
   

module.exports = router