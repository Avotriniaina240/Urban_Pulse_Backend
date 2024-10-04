const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const {checkAdmin} = require('../middleware/autorisation');
const multer = require('multer');
const pool = require('../db');

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

// Route soumettre un rapport
router.post('/', authenticateToken, upload.single('image'), reportController.submitReport);

// Route GET pour obtenir les rapports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, description, location, image, status FROM reports');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aucun rapport trouvé' });
    }
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des rapports:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des rapports' });
  }
});

// Route DELETE pour supprimer un signalement (accessible uniquement aux admins)
router.delete('/:id', authenticateToken, checkAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM reports WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Signalement non trouvé' });
    }
    res.json({ message: 'Signalement supprimé avec succès' });
  } catch (err) {
    console.error('Erreur lors de la suppression du signalement:', err.message);
    res.status(500).json({ message: 'Erreur serveur lors de la suppression du signalement' });
  }
});

router.put('/:id', authenticateToken, checkAdmin, async (req, res) => {
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

router.get('/statistics', async (req, res) => {
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

module.exports = router;