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


// Route pour créer une nouvelle discussion
router.post('/api/discussions', async (req, res) => {
  const { title, description, category } = req.body;
  const user = req.user; // Supposons que l'utilisateur connecté est stocké dans req.user

  // Vérifiez si tous les champs requis sont présents
  if (!title || !description || !category || !user) {
    return res.status(400).json({ error: 'Titre, description, catégorie, et utilisateur sont requis.' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO discussions (title, description, category, user) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, category, user.id] // Utilisez user.id si vous avez l'ID de l'utilisateur
    );
    res.status(201).json(result.rows[0]); // Retourner la nouvelle discussion créée
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors de la création de la discussion' });
  }
});



module.exports = router;
