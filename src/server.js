const express = require('express');
const multer = require('multer');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
require('dotenv').config();

// Configure multer pour gérer les fichiers téléchargés
const upload = multer({ dest: 'uploads/' }); // Spécifiez le dossier où les fichiers seront stockés

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

// Route pour soumettre un rapport
router.post('/reports', authenticateToken, upload.single('image'), async (req, res) => {
  const { description, location } = req.body;
  const image = req.file; // Image est accessible ici

  // Vérifiez que les données sont fournies
  if (!description || !location) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  try {
    // Ajoutez le rapport à la base de données
    const result = await pool.query(
      'INSERT INTO reports (description, location, image) VALUES ($1, $2, $3) RETURNING *',
      [description, location, image ? image.path : null]
    );

    res.status(201).json({ message: 'Rapport soumis avec succès', report: result.rows[0] });
  } catch (err) {
    console.error('Erreur lors de la soumission du rapport:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

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

// Route pour obtenir les statistiques globales des utilisateurs
router.get('/user-stats', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) AS total_users FROM users');
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Une erreur s\'est produite lors de la récupération des statistiques des utilisateurs.' });
  }
});

// Route pour obtenir les statistiques mensuelles des utilisateurs
router.get('/user-monthly-stats', async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    const result = await pool.query(
      'SELECT COUNT(*) AS monthly_new_users FROM users WHERE created_at >= $1',
      [startOfMonth]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching monthly user stats:', err);
    res.status(500).json({ error: 'Une erreur s\'est produite lors de la récupération des statistiques mensuelles des utilisateurs.' });
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

// Exemple de route pour récupérer les données de qualité de l'air
router.get('/air-quality', (req, res) => {
  const airQualityData = [
    { city: 'City A', AQI: 45 },
    { city: 'City B', AQI: 60 },
  ];
  res.json(airQualityData);
});

module.exports = router;
