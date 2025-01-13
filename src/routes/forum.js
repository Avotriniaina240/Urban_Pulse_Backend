const express = require('express');
const router = express.Router();
const { createPost } = require('../controllers/forumController');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');

/**
 * @swagger
 * /:
 *   post:
 *     summary: Créer un nouveau post
 *     tags: [Posts]
 *     requestBody:
 *       description: Les informations nécessaires pour créer un post
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Le titre du post
 *                 example: "Les tendances de l'urbanisme"
 *               content:
 *                 type: string
 *                 description: Le contenu du post
 *                 example: "Dans ce post, nous explorerons les tendances actuelles en urbanisme."
 *               author_id:
 *                 type: integer
 *                 description: L'ID de l'auteur du post
 *                 example: 1
 *     responses:
 *       201:
 *         description: Post créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID du nouveau post
 *                   example: 1
 *                 title:
 *                   type: string
 *                   description: Titre du post
 *                   example: "Les tendances de l'urbanisme"
 *                 content:
 *                   type: string
 *                   description: Contenu du post
 *                   example: "Dans ce post, nous explorerons les tendances actuelles en urbanisme."
 *                 author_id:
 *                   type: integer
 *                   description: ID de l'auteur du post
 *                   example: 1
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   description: Date de création du post
 *       400:
 *         description: Erreur dans les données fournies
 *       500:
 *         description: Erreur interne du serveur
 */
// Route pour insérer un post
router.post('/', createPost);

/**
 * @swagger
 * /forum:
 *   get:
 *     summary: Récupérer tous les posts du forum avec les noms d'utilisateur et le nombre de likes
 *     tags:
 *       - Forum
 *     description: Cette route permet de récupérer tous les posts du forum, incluant le nom d'utilisateur associé à chaque post ainsi que le nombre de likes.
 *     responses:
 *       200:
 *         description: Succès - Renvoie tous les posts avec le nom d'utilisateur et le nombre de likes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: ID du post.
 *                   title:
 *                     type: string
 *                     description: Titre du post.
 *                   content:
 *                     type: string
 *                     description: Contenu du post.
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: Date de création du post.
 *                   author_id:
 *                     type: integer
 *                     description: ID de l'auteur du post.
 *                   username:
 *                     type: string
 *                     description: Nom d'utilisateur de l'auteur.
 *                   likes:
 *                     type: string
 *                     nullable: true
 *                     description: Nombre de likes du post. Null si aucun like.
 *       500:
 *         description: Erreur lors de la récupération des posts.
 */
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        fp.*, 
        u.username,  -- Récupérer le nom d'utilisateur associé à author_id
        CASE 
          WHEN COUNT(pl.id) > 0 THEN COUNT(pl.id)::TEXT 
          ELSE NULL 
        END AS likes
      FROM 
        forum_posts fp
      LEFT JOIN 
        post_likes pl ON fp.id = pl.post_id
      LEFT JOIN 
        users u ON fp.author_id = u.id  -- Correctement lié avec author_id
      GROUP BY 
        fp.id, u.username  -- Nécessaire pour le GROUP BY car u.username est dans la SELECT
      ORDER BY 
        fp.created_at DESC;
    `;

    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /{postId}/comments:
 *   post:
 *     summary: Ajouter un commentaire à un post
 *     tags: [Commentaires]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         description: L'ID du post auquel le commentaire sera ajouté
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       description: Les informations nécessaires pour ajouter un commentaire
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Le contenu du commentaire
 *                 example: "C'est un article très intéressant!"
 *               author_id:
 *                 type: integer
 *                 description: L'ID de l'auteur du commentaire
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
 *                   description: ID du nouveau commentaire
 *                   example: 1
 *                 content:
 *                   type: string
 *                   description: Contenu du commentaire
 *                   example: "C'est un article très intéressant!"
 *                 author_id:
 *                   type: integer
 *                   description: ID de l'auteur du commentaire
 *                   example: 1
 *                 post_id:
 *                   type: integer
 *                   description: ID du post auquel le commentaire est associé
 *                   example: 1
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   description: Date de création du commentaire
 *       400:
 *         description: Erreur dans les données fournies
 *       404:
 *         description: Post non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
router.post('/:postId/comments', async (req, res) => {
  console.log('Handling POST request to /api/posts/:postId/comments');

  const { postId } = req.params;
  const { content, author_id } = req.body;

  // Validation des champs
  if (!content || !author_id || !postId) {
    return res.status(400).json({ message: 'Le contenu, l\'identifiant de l\'auteur et l\'identifiant du post sont requis.' });
  }

  console.log(`Received comment for post ID: ${postId}`);
  console.log(`Comment content: ${content}`);
  console.log(`Author ID: ${author_id}`);

  try {
    // Assurez-vous que la colonne correspond à 'content' ou 'text' selon votre table
    const result = await pool.query(
      'INSERT INTO comments (content, author_id, post_id) VALUES ($1, $2, $3) RETURNING *',
      [content, author_id, postId]
    );

    const newComment = result.rows[0];
    console.log('New comment saved:', newComment);

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);
    res.status(500).json({ message: `Erreur lors de l'ajout du commentaire: ${error.message}` });
  }
});
/**
 * @swagger
 * /{postId}/comments:
 *   get:
 *     summary: Récupérer tous les commentaires d'un post
 *     tags: [Commentaires]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         description: L'ID du post dont on veut récupérer les commentaires
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Liste des commentaires pour le post spécifié
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: ID du commentaire
 *                     example: 1
 *                   content:
 *                     type: string
 *                     description: Contenu du commentaire
 *                     example: "C'est un article très intéressant!"
 *                   author_id:
 *                     type: integer
 *                     description: ID de l'auteur du commentaire
 *                     example: 1
 *                   post_id:
 *                     type: integer
 *                     description: ID du post auquel le commentaire est associé
 *                     example: 1
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: Date de création du commentaire
 *       404:
 *         description: Post non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
  router.get('/:postId/comments', async (req, res) => {
    const { postId } = req.params;
    try {
      const result = await pool.query(`
        SELECT comments.*, users.username AS author
        FROM comments
        JOIN users ON comments.author_id = users.id
        WHERE post_id = $1
        ORDER BY comments.created_at DESC
      `, [postId]);
      
      res.json(result.rows);
    } catch (error) {
      console.error('Erreur lors de la récupération des commentaires:', error);
      res.status(500).json({ message: 'Erreur lors de la récupération des commentaires' });
    }
  });

  /**
 * @swagger
 * /{id}/like:
 *   patch:
 *     summary: Ajouter ou supprimer un like sur un post
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: L'ID du post à liker ou déliker
 *         schema:
 *           type: integer
 *           example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               increment:
 *                 type: boolean
 *                 description: True pour liker, false pour déliker
 *                 example: true
 *     responses:
 *       200:
 *         description: Post mis à jour avec le nouveau nombre de likes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID du post
 *                   example: 1
 *                 title:
 *                   type: string
 *                   description: Titre du post
 *                   example: "Titre du post"
 *                 content:
 *                   type: string
 *                   description: Contenu du post
 *                   example: "Ceci est le contenu du post."
 *                 likes:
 *                   type: integer
 *                   description: Nombre total de likes
 *                   example: 5
 *       400:
 *         description: Erreur de validation du champ "increment"
 *       404:
 *         description: Post non trouvé
 *       500:
 *         description: Erreur interne du serveur
 */
  router.patch('/:id/like' ,authenticateToken, async (req, res) => {
    const postId = req.params.id; 
    console.log(req.user)
    const userId = req.user.id; 
    const { increment } = req.body; 
  
    if (typeof increment !== 'boolean') {
      return res.status(400).json({ message: 'Le champ "increment" doit être un booléen.' });
    }
  
    try {
      // Rechercher le post dans la base de données
      const postResult = await pool.query(`SELECT * FROM forum_posts WHERE id = $1`, [postId]);
  
      if (postResult.rows.length === 0) {
        return res.status(404).json({ message: 'Post non trouvé' });
      }
  
      const post = postResult.rows[0]; 
  
      if (increment) {
        // Vérifier si l'utilisateur a déjà aimé le post
        const likeResult = await pool.query(`SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
  
        if (likeResult.rows.length === 0) {
          // Ajouter un nouveau like
          await pool.query(`INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`, [postId, userId]);
        }
      } else {
        // Supprimer le like si l'utilisateur l'a déjà aimé
        await pool.query(`DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`, [postId, userId]);
      }
  
      // Compter le nombre de likes
      const countResult = await pool.query(`SELECT COUNT(*) as likes FROM post_likes WHERE post_id = $1`, [postId]);
      const newLikes = parseInt(countResult.rows[0].likes);
      console.log({ ...post, likes: newLikes })
  
      // Retourner le nombre de likes mis à jour
      res.json({ ...post, likes: newLikes });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des likes:', error.message); 
      res.status(500).json({ message: 'Erreur du serveur' }); 
    }
  });

module.exports = router;