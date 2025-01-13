const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const router = express.Router();
const pool = require('./db');
const { Sequelize } = require('sequelize');
const moment = require('moment');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
const reportsRouter = require('./routes/reports');
const discussionsRouter = require('./routes/discussions'); 
const forumRoutes = require('./routes/forum');
const commentRoutes = require('./routes/comments'); 
const userRoutes = require('./routes/user'); 
require('dotenv').config();
const User = require('./models/User');
const {authenticateToken} = require('./middleware/auth');
const {checkAdmin} = require('./middleware/autorisation');
const {checkRole} = require('./middleware/autoRole');
const {checkUrbanist} = require('./middleware/roleUrb');
const UserModel = require('./models/User');


function someFunction() {
  const User = require('./models/User');
}


router.use('/auth', authRouter);

router.use('/reports', reportsRouter);

router.use('/discussions', discussionsRouter);

router.use('/posts', forumRoutes);

router.use('/comments', commentRoutes);

router.use('/users', userRoutes);


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



// Route GET pour obtenir les informations de l'utilisateur
router.get('/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id; 

  try {
    const result = await pool.query('SELECT id, username, email, phone_number, address, date_of_birth AS "dateOfBirth", profile_picture_url AS "profilePictureUrl", role FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.status(200).json(result.rows[0]); // Retourne les informations de l'utilisateur
  } catch (error) {
    console.error('Erreur lors de la récupération des informations utilisateur:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des informations utilisateur' });
  }
});

// Route PUT pour mettre à jour les informations de l'utilisateur
/*router.put('/users/:id', authenticateToken, async (req, res) => {
  const userId = req.params.id;
  const { username, email, phoneNumber, address, dateOfBirth, profilePictureUrl } = req.body;

  try {
    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, phone_number = $3, address = $4, date_of_birth = $5, profile_picture_url = $6 WHERE id = $7 RETURNING *',
      [username, email, phoneNumber, address, dateOfBirth, profilePictureUrl, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.status(200).json(result.rows[0]); // Retourne les nouvelles informations de l'utilisateur
  } catch (error) {
    console.error('Erreur lors de la mise à jour des informations utilisateur:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour des informations utilisateur' });
  }
});*/

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'rabotosonavotriniaina@gmail.com',
    pass: 'oflk xyto kfyw vjlt',
  },
});

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const findUserByEmail = async (email) => {
  return await UserModel.findOne({ email });
};

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const resetToken = generateResetToken();
    user.resetToken = resetToken;
    user.resetTokenExpiration = Date.now() + 1000*60*10;
    await user.save();

    const mailOptions = {
      from: 'rabotosonavotriniaina@gmail.com',
      to: email,
      subject: 'Réinitialisation du mot de passe',
      text: `Veuillez utiliser ce lien pour réinitialiser votre mot de passe : http://localhost:3000/reset-password/${resetToken}`,
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'E-mail de réinitialisation envoyé' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  try {
    // Recherche de l'utilisateur avec le token de réinitialisation
    const user = await User.findOne({ where: { reset_password_token: token } });

    // Vérification si l'utilisateur existe
    if (!user) {
      return res.status(400).json({ message: 'Token invalide' });
    }

    // Vérification si le token a expiré
    if (moment().isAfter(moment(user.resetTokenExpiration))) {
      return res.status(400).json({ message: 'Le token a expiré' });
    }

    // Mise à jour du mot de passe
    user.password = password;
    user.reset_password_token = null; // Réinitialisation du token
    user.resetTokenExpiration = null; // Réinitialisation de l'expiration du token
    await user.save(); // Sauvegarde des changements

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation du mot de passe' });
  }
});

// Route pour mettre à jour le profil utilisateur
router.put('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email, phoneNumber, address, dateOfBirth, profile_picture_url } = req.body;

  try {
      const query = `
          UPDATE users 
          SET 
              username = $1,
              email = $2,
              phone_number = $3,
              address = $4,
              date_of_birth = $5,
              profile_picture_url = $6,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
          RETURNING *;
      `;

      const values = [
          username,
          email,
          phoneNumber,
          address,
          dateOfBirth,
          profile_picture_url, // Image Base64
          id
      ];

      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
          return res.status(404).json({ message: 'Utilisateur non trouvé.' });
      }

      res.status(200).json(result.rows[0]);
  } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      res.status(500).json({ message: 'Erreur du serveur.' });
  }
});

module.exports = router;
