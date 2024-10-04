const express = require('express');
const router = express.Router();
const { createPost } = require('../controllers/forumController');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../db');

// Route pour insérer un post
router.post('/', createPost);

// Route pour récupérer tous les posts avec les noms d'utilisateur
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

  router.post('/:postId/comments', async (req, res) => {
    console.log('Handling POST request to /api/posts/:postId/comments');
    const { postId } = req.params;
    const { content, author_id } = req.body;
  
    console.log(`Received comment for post ID: ${postId}`);
    console.log(`Comment content: ${content}`);
    console.log(`Author ID: ${author_id}`);
  
    try {
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