const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
require('dotenv').config();
const User = require('./models/User');

const API_KEY = '13c8b873a51de1239ad5606887a1565e';



// Route pour récupérer les coordonnées d'une ville
router.get('/locations', async (req, res) => {
    const { cities } = req.query; // Les villes sont passées en paramètre de requête
    const cityList = cities.split(',').map(city => city.trim());

    try {
        const locationData = await Promise.all(cityList.map(async (city) => {
            const response = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}`);
            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération des données pour la ville : ${city}`);
            }
            const data = await response.json();
            return { city, lat: data.coord.lat, lon: data.coord.lon };
        }));

        res.json(locationData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données de localisation:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des données de localisation' });
    }
});

// Route pour traiter les coordonnées
router.post('/coordinates', (req, res) => {
    const { coordinates } = req.body; // Les coordonnées sont envoyées dans le corps de la requête
    const coordinateList = coordinates.split(';').map(coord => {
        const [lat, lon] = coord.split(',').map(Number);
        return { lat, lon };
    });
    res.json(coordinateList);
});

// Route pour gérer les quartiers (similaire à celle des villes)
router.get('/neighborhoods', async (req, res) => {
    const { neighborhoods } = req.query;
    const neighborhoodList = neighborhoods.split(',').map(neighborhood => neighborhood.trim());

    try {
        const neighborhoodData = await Promise.all(neighborhoodList.map(async (neighborhood) => {
            const response = await fetch(`http://api.openweathermap.org/data/2.5/weather?q=${neighborhood}&appid=${API_KEY}`);
            if (!response.ok) {
                throw new Error(`Erreur lors de la récupération des données pour le quartier : ${neighborhood}`);
            }
            const data = await response.json();
            return { neighborhood, lat: data.coord.lat, lon: data.coord.lon };
        }));

        res.json(neighborhoodData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données des quartiers:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération des données des quartiers' });
    }
});

// Route pour renvoyer les données combinées au front-end
router.get('/urban-analysis', async (req, res) => {
    const { cities, coordinates, neighborhoods } = req.query;

    try {
        const cityData = await router.handle('/locations', req, res);
        const coordinateData = await router.handle('/coordinates', req, res);
        const neighborhoodData = await router.handle('/neighborhoods', req, res);

        const mergedData = [...cityData, ...coordinateData, ...neighborhoodData];
        res.json(mergedData);
    } catch (error) {
        console.error('Erreur lors de la récupération des données combinées:', error);
        res.status(500).json({ message: 'Erreur serveur lors de la récupération des données combinées' });
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


// Middleware d'authentification
async function authenticateToken(req, res, next) {
  const authorization = req.headers['authorization'];
  if (!authorization || !authorization.startsWith("Bearer")) {
    return res.status(401).send('Accès refusé');
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).send('Jeton invalide');

    try {
      const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
      if (userResult.rows.length === 0) return res.status(403).send('Jeton invalide');
      req.user = userResult.rows[0];
      next();
    } catch (err) {
      console.error(err);
      res.status(500).send('Erreur serveur');
    }
  });
}

// Middleware pour vérifier le rôle d'admin
function checkAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Accès interdit' });
  }
}

// Middleware pour vérifier le rôle d'urbanist
function checkUrbanist(req, res, next) {
  if (req.user && req.user.role === 'urbanist') {
    next();
  } else {
    res.status(403).json({ message: 'Accès interdit' });
  }
}

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

router.use('/auth', authRouter);

// Route pour obtenir les utilisateurs (accessible uniquement aux admins)
router.get('/admin/users', authenticateToken, checkAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
}); 

// Route pour supprimer un utilisateur (accessible uniquement aux admins)
router.delete('/admin/users/:id', authenticateToken, checkAdmin, async (req, res) => {
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

// Route pour mettre à jour un utilisateur (accessible uniquement aux admins)
router.put('/admin/users/:id', authenticateToken, checkAdmin, async (req, res) => {
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

// Exemple de route pour récupérer les données de qualité de l'air
router.get('/air-quality', (req, res) => {
  const airQualityData = [
    { city: 'City A', AQI: 45 },
    { city: 'City B', AQI: 60 },
  ];
  res.json(airQualityData);
});

// Route pour soumettre un rapport
router.post('/reports', authenticateToken, upload.single('image'), async (req, res) => {
  const { description, location } = req.body;
  const image = req.file; // Image est accessible ici
  const status = 'pending'; // Statut initial du rapport

  // Vérifiez que les données sont fournies
  if (!description || !location) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  try {
    // Ajoutez le rapport à la base de données avec le statut
    const result = await pool.query(
      'INSERT INTO reports (description, location, image, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [description, location, image ? image.path : null, status]
    );

    res.status(201).json({ message: 'Rapport soumis avec succès', report: result.rows[0] });
  } catch (err) {
    console.error('Erreur lors de la soumission du rapport:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Route pour obtenir les rapports (accessible uniquement aux utilisateurs authentifiés)
router.get('/reports', authenticateToken, async (req, res) => {
  try {
    // Sélectionner toutes les colonnes sauf `created_at`
    const result = await pool.query('SELECT id, description, location, image, status FROM reports');

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aucun rapport trouvé' });
    }

    // Répondre avec les rapports, y compris le `status`
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des rapports:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des rapports' });
  }
});

// Route pour supprimer un signalement (accessible uniquement aux admins)
router.delete('/reports/:id', authenticateToken, checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM reports WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Signalement non trouvé' });
    }
    res.json({ message: 'Signalement supprimé avec succès' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

router.put('/reports/:id', authenticateToken, checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { description, status } = req.body;

  // Validation du statut uniquement
  const validStatuses = ['soumis', 'en attente', 'en cours', 'résolu'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Le statut est requis et doit être valide' });
  }

  try {
    // Si la description est présente, la mettre à jour, sinon ne pas toucher au champ description
    let query = 'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *';
    let values = [status, id];

    // Si la description est fournie, l'inclure dans la requête
    if (description) {
      query = 'UPDATE reports SET description = $1, status = $2 WHERE id = $3 RETURNING *';
      values = [description, status, id];
    }

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Signalement non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erreur lors de la mise à jour du rapport:', err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Route pour créer une nouvelle discussion
router.post('/discussions', async (req, res) => {
  const { title, description, category, content, userId } = req.body; // Inclure userId

  // Vérification des champs requis
  if (!title || !description || !category || !content || !userId) {
    return res.status(400).json({ error: 'Titre, description, catégorie, contenu et utilisateur sont requis.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO discussions (title, description, category, content, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, category, content, userId] // Ajouter userId ici
    );
    res.status(201).json(result.rows[0]); // Renvoie la discussion créée
  } catch (error) {
    console.error('Erreur lors de la création de la discussion:', error);
    res.status(500).json({ error: 'Erreur lors de la création de la discussion.' });
  }
});

// Route pour récupérer toutes les discussions
router.get('/discussions', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM discussions');
    res.json(result.rows); // Renvoie toutes les discussions
  } catch (error) {
    console.error('Erreur lors de la récupération des discussions:', error);
    res.status(500).send('Erreur lors de la récupération des discussions');
  }
});

// Route pour ajouter un commentaire
router.post('/comments', authenticateToken, async (req, res) => {
  const { discussionId, text } = req.body;

  if (!discussionId || !text) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO comments (discussion_id, text) VALUES ($1, $2) RETURNING *',
      [discussionId, text]
    );

    res.status(201).json({ message: 'Commentaire ajouté avec succès', comment: result.rows[0] });
  } catch (err) {
    console.error('Erreur lors de l\'ajout du commentaire:', err.message);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du commentaire.' });
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

router.get('/reports/statistics', async (req, res) => {
  try {
    // Comptage total des rapports
    const totalReportsResult = await pool.query('SELECT COUNT(*) AS total FROM reports');
    const totalReports = parseInt(totalReportsResult.rows[0].total, 10);

    // Comptage des rapports en fonction des statuts
    const resolvedResult = await pool.query('SELECT COUNT(*) AS count FROM reports WHERE status = $1', ['résolu']);
    const resolvedCount = parseInt(resolvedResult.rows[0].count, 10);

    const pendingResult = await pool.query('SELECT COUNT(*) AS count FROM reports WHERE status = $1', ['en attente']);
    const pendingCount = parseInt(pendingResult.rows[0].count, 10);

    const inProgressResult = await pool.query('SELECT COUNT(*) AS count FROM reports WHERE status = $1', ['en cours']);
    const inProgressCount = parseInt(inProgressResult.rows[0].count, 10);

    res.status(200).json({
      totalReports,
      resolved: resolvedCount,
      pending: pendingCount,
      inProgress: inProgressCount,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
});

// Route pour ajouter les posts
router.post('/api/posts', async (req, res) => {
  const { title, content, author_id } = req.body;
  try {
    await pool.query('INSERT INTO forum_posts (title, content, author_id) VALUES ($1, $2, $3)', [title, content, author_id]);
    res.status(201).json({ message: 'Post created successfully' });
  } catch (error) {
    console.error('Error inserting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Route pour inserer les posts 
router.post('/posts', async (req, res) => {
  const { title, content, author_id } = req.body;
  try {
    // Insertion du nouveau post dans la base de données
    await pool.query('INSERT INTO forum_posts (title, content, author_id) VALUES ($1, $2, $3)', [title, content, author_id]);

    // Réponse avec un message de succès et un statut 201 (Created)
    res.status(201).json({ message: 'Post ajouté avec succès', post: { title, content, author_id } });
  } catch (error) {
    console.error('Error inserting post:', error);
    // Réponse avec un message d'erreur et un statut 500 (Internal Server Error)
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Route pour récupérer tous les posts avec les noms d'utilisateur
router.get('/posts', async (req, res) => {
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


// Route pour récupérer les informations d'un utilisateur par authorId
router.get('/users/:authorId', async (req, res) => {
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

router.patch('/posts/:id/like' ,authenticateToken, async (req, res) => {
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

// Log toutes les requêtes reçues
router.use((req, res, next) => {
  next();
});

// Route pour ajouter un commentaire
router.post('/posts/:postId/comments', async (req, res) => {
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

router.get('/posts/:postId/comments', async (req, res) => {
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


module.exports = router;
