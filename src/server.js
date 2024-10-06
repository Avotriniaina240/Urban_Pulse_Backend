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


const API_KEY = '13c8b873a51de1239ad5606887a1565e';


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

router.use('/reports', reportsRouter);

router.use('/discussions', discussionsRouter);

router.use('/posts', forumRoutes);

router.use('/comments', commentRoutes);


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

// Log toutes les requêtes reçues
router.use((req, res, next) => {
  next();
});


module.exports = router;
