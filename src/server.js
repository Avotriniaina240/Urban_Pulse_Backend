const express = require('express');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
require('dotenv').config();


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

// Middleware d'authentification
async function authenticateToken(req, res, next) {
  const authorization = req.headers['authorization'];
  if (!authorization || !authorization.startsWith("Bearer")) {
    return res.status(401).send('Accès refusé');
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, 'your_jwt_secret', async (err, decoded) => {
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

// Route pour obtenir les utilisateurs
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users');
    res.json(result.rows); // Renvoie les données en format JSON
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
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

// Exemple de middleware pour l'authentification
router.use((req, res, next) => {
  // Supposons que l'utilisateur est stocké dans req.user après l'authentification
  req.user = { id: 'id-de-l-utilisateur-connecté' }; // Exemple
  next();
});

// Route pour obtenir les détails de l'utilisateur connecté
router.get('/users/me', (req, res) => {
  // Utilisez req.user pour obtenir les détails de l'utilisateur connecté
  const user = { id: req.user.id, username: 'exampleUser' }; // Exemple
  res.json(user);
});

// Route pour promouvoir un utilisateur au rôle d'admin
router.put('/admin/promote/:id', authenticateToken, checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING *', ['admin', id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

// Route pour obtenir les utilisateurs (accessible uniquement aux urbanists)
router.get('/urbanist/users', authenticateToken, checkUrbanist, async (req, res) => {
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
/*
// Exemple de route pour récupérer les données de qualité de l'air
router.get('/air-quality', (req, res) => {
  const airQualityData = [
    { city: 'City A', AQI: 45 },
    { city: 'City B', AQI: 60 },
  ];
  res.json(airQualityData);
});

// Exemple de route pour récupérer les données de circulation
router.get('/traffic-data', async (req, res) => {
  try {
      const results = await pool.query('SELECT * FROM traffic_data');
      res.json(results.rows);
  } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la récupération des données.' });
  }
});

// Exemple de route pour récupérer les données de criminalité
router.get('/crime-data', async (req, res) => {
  try {
      const results = await pool.query('SELECT * FROM crime_data');
      res.json(results.rows);
  } catch (err) {
      res.status(500).json({ error: 'Erreur lors de la récupération des données.' });
  }
});*/


module.exports = router;
