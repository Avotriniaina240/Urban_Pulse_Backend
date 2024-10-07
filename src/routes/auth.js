const express = require('express');
const {loginController, registerController,forgotPassword, resetPassword} = require('../controllers/authController')
const { authenticateToken } = require('../middleware/auth');
const {checkRole} = require('../middleware/autoRole');

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Connecter un utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       description: Informations de connexion de l'utilisateur
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Adresse email de l'utilisateur
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 description: Mot de passe de l'utilisateur
 *                 example: password123
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT pour l'authentification
 *       401:
 *         description: Erreur d'authentification
 */
router.post('/login', loginController)

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Enregistrer un nouvel utilisateur
 *     tags: [Authentification]
 *     requestBody:
 *       description: Informations pour enregistrer un nouvel utilisateur
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Nom d'utilisateur
 *                 example: johnDoe
 *               email:
 *                 type: string
 *                 description: Adresse email de l'utilisateur
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 description: Mot de passe de l'utilisateur
 *                 example: password123
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *       400:
 *         description: Erreur dans les données fournies
 */
router.post('/register', registerController)

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     summary: Demander la réinitialisation du mot de passe
 *     tags: [Authentification]
 *     requestBody:
 *       description: Email pour recevoir le lien de réinitialisation du mot de passe
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Adresse email de l'utilisateur
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Email envoyé avec succès
 *       404:
 *         description: Utilisateur non trouvé
 */
// Route pour demander la réinitialisation du mot de passe
router.post('/forgot-password',forgotPassword );
 
/**
 * @swagger
 * /reset-password/{token}:
 *   post:
 *     summary: Réinitialiser le mot de passe
 *     tags: [Authentification]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         description: Token de réinitialisation du mot de passe
 *         schema:
 *           type: string
 *     requestBody:
 *       description: Nouveau mot de passe pour l'utilisateur
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *                 description: Nouveau mot de passe de l'utilisateur
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès
 *       400:
 *         description: Le token est invalide ou a expiré
 */
router.post('/reset-password/:token', resetPassword);

  

module.exports = router