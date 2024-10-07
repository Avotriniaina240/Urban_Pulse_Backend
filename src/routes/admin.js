const express = require('express');
const router = express.Router();
const { deleteUser } = require('../controllers/adminController'); // Import du contrôleur
const authenticateToken = require('../middlewares/authenticateToken'); // Middleware d'authentification
const checkRole = require('../middlewares/checkRole');

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur
 *     description: Supprimer un utilisateur par son ID (seulement pour les administrateurs).
 *     tags:
 *       - Utilisateurs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur à supprimer
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.delete('/admin/users/:id', authenticateToken, checkRole(['admin']), deleteUser);

/**
 * @swagger
 * /{authorId}:
 *   get:
 *     summary: Récupérer le nom d'utilisateur par ID d'auteur
 *     description: Obtenir le nom d'utilisateur basé sur l'ID de l'auteur.
 *     tags:
 *       - Utilisateurs
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'auteur
 *     responses:
 *       200:
 *         description: Nom d'utilisateur récupéré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/:authorId', async (req, res) => {
  try {
    const { authorId } = req.params;
    const { rows } = await pool.query('SELECT username FROM users WHERE id = $1', [authorId]); // Remplacez 'users' et 'username' par les noms appropriés

    if (rows.length > 0) {
      res.status(200).json(rows[0]);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Récupérer un utilisateur spécifique
 *     description: Obtenir les informations d'un utilisateur spécifique par ID.
 *     tags:
 *       - Utilisateurs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de l'utilisateur
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur récupérées
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone_number:
 *                   type: string
 *                 address:
 *                   type: string
 *                 date_of_birth:
 *                   type: string
 *       404:
 *         description: Utilisateur non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.get('/api/admin/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByPk(userId); // Sequelize: 'findByPk' pour trouver par clé primaire
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

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

module.exports = router;
