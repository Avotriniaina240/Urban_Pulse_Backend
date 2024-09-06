const express = require('express');
const multer = require('multer');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
require('dotenv').config();

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

// Route pour obtenir les statistiques hebdomadaires des utilisateurs
router.get('/user-weekly-stats', async (req, res) => {
  try {
    const currentDate = new Date();
    const startOfWeek = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay())); // Début de la semaine (dimanche)

    const result = await pool.query(
      'SELECT COUNT(*) AS weekly_new_users FROM users WHERE created_at >= $1',
      [startOfWeek]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching weekly user stats:', err);
    res.status(500).json({ error: 'Une erreur s\'est produite lors de la récupération des statistiques hebdomadaires des utilisateurs.' });
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

// Route pour mettre à jour un signalement (accessible uniquement aux admins)
router.put('/reports/:id', authenticateToken, checkAdmin, async (req, res) => {
  const { id } = req.params;
  const { description, status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE reports SET description = $1, status = $2 WHERE id = $3 RETURNING *',
      [description, status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Signalement non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
});

router.get('/reports/statistics', async (req, res) => {
  try {
    // Requête pour obtenir le nombre total de signalements
    const totalReportsResult = await pool.query('SELECT COUNT(*) AS total FROM reports');
    
    // Extraction du nombre total de signalements
    const totalReports = totalReportsResult.rows[0].total;
    
    res.status(200).json({
      totalReports: parseInt(totalReports, 10), // Assurez-vous que c'est un nombre entier
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des statistiques' });
  }
});

module.exports = router;
