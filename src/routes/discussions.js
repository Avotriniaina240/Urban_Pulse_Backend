const express = require('express');
const router = express.Router();
const { createDiscussion } = require('../controllers/discussionController');

/**
 * @swagger
 * /:
 *   post:
 *     summary: Créer une nouvelle discussion
 *     tags: [Discussions]
 *     requestBody:
 *       description: Les informations nécessaires pour créer une discussion
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Le titre de la discussion
 *                 example: "Nouvelle discussion sur le développement durable"
 *               content:
 *                 type: string
 *                 description: Le contenu de la discussion
 *                 example: "Que pensez-vous des initiatives de développement durable dans les villes modernes ?"
 *               author_id:
 *                 type: integer
 *                 description: L'ID de l'auteur de la discussion
 *                 example: 1
 *     responses:
 *       201:
 *         description: Discussion créée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID de la nouvelle discussion
 *                 title:
 *                   type: string
 *                   description: Titre de la discussion
 *                 content:
 *                   type: string
 *                   description: Contenu de la discussion
 *                 author_id:
 *                   type: integer
 *                   description: ID de l'auteur de la discussion
 *       400:
 *         description: Erreur dans les données fournies
 *       500:
 *         description: Erreur interne du serveur
 */

router.post('/', createDiscussion);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Récupérer toutes les discussions
 *     tags: [Discussions]
 *     responses:
 *       200:
 *         description: Liste de toutes les discussions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: ID de la discussion
 *                     example: 1
 *                   title:
 *                     type: string
 *                     description: Titre de la discussion
 *                     example: "Nouvelle discussion sur le développement durable"
 *                   content:
 *                     type: string
 *                     description: Contenu de la discussion
 *                     example: "Que pensez-vous des initiatives de développement durable dans les villes modernes ?"
 *                   author_id:
 *                     type: integer
 *                     description: ID de l'auteur de la discussion
 *                     example: 1
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: Date de création de la discussion
 *       500:
 *         description: Erreur lors de la récupération des discussions
 */

// Route pour récupérer toutes les discussions
router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM discussions');
      res.json(result.rows); // Renvoie toutes les discussions
    } catch (error) {
      console.error('Erreur lors de la récupération des discussions:', error);
      res.status(500).send('Erreur lors de la récupération des discussions');
    }
  });

module.exports = router;