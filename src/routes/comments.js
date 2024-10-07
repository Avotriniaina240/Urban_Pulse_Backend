const express = require('express');
const router = express.Router();
const { addComment } = require('../controllers/commentController'); 
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /:
 *   post:
 *     summary: Ajouter un commentaire
 *     tags: [Commentaires]
 *     security:
 *       - bearerAuth: []  # Spécifie que l'authentification via JWT est requise
 *     requestBody:
 *       description: Contenu du commentaire à ajouter
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Le contenu du commentaire
 *                 example: "Ceci est un commentaire exemple"
 *               post_id:
 *                 type: integer
 *                 description: ID du post auquel le commentaire est lié
 *                 example: 1
 *     responses:
 *       201:
 *         description: Commentaire ajouté avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID du commentaire nouvellement créé
 *                 content:
 *                   type: string
 *                   description: Contenu du commentaire
 *                 post_id:
 *                   type: integer
 *                   description: ID du post auquel le commentaire est lié
 *                 author_id:
 *                   type: integer
 *                   description: ID de l'auteur du commentaire
 *       401:
 *         description: Utilisateur non authentifié ou token invalide
 *       400:
 *         description: Erreur dans les données fournies
 */
router.post('/', authenticateToken, addComment);

module.exports = router;