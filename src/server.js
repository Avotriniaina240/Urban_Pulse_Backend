const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
const reportsRouter = require('./routes/reports');
const discussionsRouter = require('./routes/discussions'); 
const forumRoutes = require('./routes/forum');
const commentRoutes = require('./routes/comments'); 
require('dotenv').config();
const User = require('./models/User');
const {authenticateToken} = require('./middleware/auth');
const {checkAdmin} = require('./middleware/autorisation');
const {checkRole} = require('./middleware/autoRole');
const {checkUrbanist} = require('./middleware/roleUrb');


router.use('/auth', authRouter);

router.use('/reports', reportsRouter);

router.use('/discussions', discussionsRouter);

router.use('/posts', forumRoutes);

router.use('/comments', commentRoutes);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: Obtenir la liste des utilisateurs (accessible uniquement aux admins)
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []  # Indique que l'authentification par token est requise
 *     responses:
 *       200:
 *         description: Liste des utilisateurs récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   username:
 *                     type: string
 *                     example: "john_doe"
 *                   email:
 *                     type: string
 *                     example: "john@example.com"
 *                   role:
 *                     type: string
 *                     example: "admin"
 *       500:
 *         description: Erreur interne du serveur lors de la récupération des utilisateurs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur serveur"
 */
// Route pour obtenir les utilisateurs (accessible uniquement aux admins)
router.get('/admin/users', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

/**
 * @swagger
 * /admin/users/{id}:
 *   delete:
 *     summary: Supprimer un utilisateur (accessible uniquement aux admins)
 *     tags: [Utilisateurs]
 *     security:
 *       - bearerAuth: []  # Indique que l'authentification par token est requise
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de l'utilisateur à supprimer
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Utilisateur supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Utilisateur supprimé avec succès'
 *       404:
 *         description: Utilisateur non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Utilisateur non trouvé'
 *       500:
 *         description: Erreur interne du serveur lors de la suppression de l'utilisateur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 'Erreur serveur'
 */
router.delete('/admin/users/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json({ message: 'Utilisateur supprimé avec succès' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

/**
 * @middleware
 * Logs all incoming requests.
 * This middleware can be useful for monitoring API usage and debugging.
 */
// Log toutes les requêtes reçues
router.use((req, res, next) => {
  next();
});

/**
 * @swagger
 * /admin/users/{id}:
 *   put:
 *     summary: Update a user
 *     description: This endpoint allows an admin to update a user's information, including username, email, and role.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the user to be updated
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: New username for the user
 *               email:
 *                 type: string
 *                 format: email
 *                 description: New email address for the user
 *               role:
 *                 type: string
 *                 description: New role for the user (e.g., admin, citizen, urbanist)
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Utilisateur non trouvé
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Erreur serveur
 */
// Route pour mettre à jour un utilisateur (accessible uniquement aux admins)
router.put('/admin/users/:id', authenticateToken, checkRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { username, email, role } = req.body;
  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, role = $3 WHERE id = $4 RETURNING *',
      [username, email, role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

/**
 * @swagger
 * /user-stats:
 *   get:
 *     summary: Retrieve user statistics
 *     description: This endpoint returns statistics about users, including counts by role (citizen, admin, urbanist) and total number of users.
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 citizen_count:
 *                   type: integer
 *                   example: 120
 *                 admin_count:
 *                   type: integer
 *                   example: 10
 *                 urbanist_count:
 *                   type: integer
 *                   example: 5
 *                 total_users:
 *                   type: integer
 *                   example: 135
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Une erreur s'est produite lors de la récupération des statistiques des utilisateurs.
 */
router.get('/user-stats', async (req, res) => {
  try {
    // Requête pour obtenir le nombre d'utilisateurs par rôle
    const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN role = 'citizen' THEN 1 END) AS citizen_count,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) AS admin_count,
        COUNT(CASE WHEN role = 'urbanist' THEN 1 END) AS urbanist_count,
        COUNT(*) AS total_users
      FROM users
    `);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Une erreur s\'est produite lors de la récupération des statistiques des utilisateurs.' });
  }
});

// Configure Multer pour sauvegarder les images dans un dossier spécifique
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Renomme le fichier avec un timestamp
  },
});

const upload = multer({ storage: storage });

/**
 * @swagger
 * /users/{id}/upload-profile-picture:
 *   post:
 *     summary: Upload a profile picture for a user
 *     description: This endpoint allows a user to upload a profile picture using Base64 image data.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID of the user whose profile picture is being uploaded
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               imageData:
 *                 type: string
 *                 description: Base64 encoded image data
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile picture uploaded successfully
 *                 fileUrl:
 *                   type: string
 *                   example: http://example.com/path/to/image.jpg
 *       400:
 *         description: Invalid user ID or no image data provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Invalid user ID
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User not found
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Internal server error
 */
// Route pour le téléchargement de l'image de profil
router.post('/users/:id/upload-profile-picture', async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).send({ message: 'Invalid user ID' });
  }

  // Vérifiez que l'image est présente dans le corps de la requête
  const { imageData } = req.body; // Assurez-vous que 'imageData' contient l'image en Base64

  if (!imageData) {
    return res.status(400).send({ message: 'No image data provided' });
  }

  try {
    // Vous pouvez éventuellement traiter l'image ici si nécessaire
    // Par exemple, sauvegarder l'image sur le serveur ou dans une base de données

    // Pour stocker l'URL de l'image dans la base de données
    const fileUrl = imageData; // Cela peut être une URL à partir de laquelle l'image est accessible

    const result = await pool.query(
      'UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING *',
      [fileUrl, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send({ message: 'Profile picture uploaded successfully', fileUrl });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'image de profil:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});



module.exports = router;
