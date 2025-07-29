const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const {checkAdmin} = require('../middleware/autorisation');
const multer = require('multer');
const pool = require('../db');
const fs = require('fs');
const path = require('path');

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

/**
 * @swagger
 * /:
 *   post:
 *     summary: Soumettre un rapport
 *     tags: [Rapports]
 *     security:
 *       - BearerAuth: []  # Indique que l'authentification est requise
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Titre du rapport
 *                 example: "Problème de circulation"
 *               description:
 *                 type: string
 *                 description: Description détaillée du rapport
 *                 example: "Il y a un embouteillage important à l'entrée de la ville."
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image associée au rapport (facultatif)
 *     responses:
 *       201:
 *         description: Rapport soumis avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   description: ID du rapport soumis
 *                   example: 1
 *                 title:
 *                   type: string
 *                   description: Titre du rapport
 *                   example: "Problème de circulation"
 *                 description:
 *                   type: string
 *                   description: Description du rapport
 *                   example: "Il y a un embouteillage important à l'entrée de la ville."
 *                 imageUrl:
 *                   type: string
 *                   description: URL de l'image soumise
 *                   example: "http://example.com/images/report.jpg"
 *       400:
 *         description: Erreur de validation des données du rapport
 *       401:
 *         description: Non autorisé, token d'authentification manquant ou invalide
 *       500:
 *         description: Erreur interne du serveur
 */
// Route soumettre un rapport
router.post('/', authenticateToken, upload.single('image'), reportController.submitReport);

/**
 * @swagger
 * /:
 *   get:
 *     summary: Récupérer tous les rapports
 *     tags: [Rapports]
 *     security:
 *       - BearerAuth: []  # Indique que l'authentification est requise
 *     responses:
 *       200:
 *         description: Liste des rapports récupérés avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: ID du rapport
 *                     example: 1
 *                   description:
 *                     type: string
 *                     description: Description du rapport
 *                     example: "Il y a un embouteillage important à l'entrée de la ville."
 *                   location:
 *                     type: string
 *                     description: Localisation du rapport
 *                     example: "Entrée de la ville"
 *                   image:
 *                     type: string
 *                     description: URL de l'image associée au rapport
 *                     example: "http://example.com/images/report.jpg"
 *                   status:
 *                     type: string
 *                     description: Statut du rapport
 *                     example: "soumis"
 *       404:
 *         description: Aucun rapport trouvé
 *       401:
 *         description: Non autorisé, token d'authentification manquant ou invalide
 *       500:
 *         description: Erreur interne du serveur
 */
// Route GET pour obtenir les rapports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, description, location, image, status FROM reports');
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Aucun rapport trouvé' });
    }
    
    // Tronquer la description
    const reportsShort = result.rows.map(report => ({
      ...report,
      description: report.description.length > 100
        ? report.description.substring(0, 100) + '...'
        : report.description
    }));

    res.status(200).json(reportsShort);
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

/**
 * @swagger
 * /{id}:
 *   delete:
 *     summary: Supprimer un signalement
 *     tags: [Rapports]
 *     security:
 *       - BearerAuth: []  # Indique que l'authentification est requise
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID du signalement à supprimer
 *         schema:
 *           type: integer
 *           example: 1
 *     responses:
 *       200:
 *         description: Signalement supprimé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Signalement supprimé avec succès"
 *       404:
 *         description: Signalement non trouvé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Signalement non trouvé"
 *       403:
 *         description: Non autorisé, accès refusé (utilisateur non admin)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Accès refusé : utilisateur non autorisé"
 *       401:
 *         description: Non autorisé, token d'authentification manquant ou invalide
 *       500:
 *         description: Erreur interne du serveur
 */
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

/**
 * @swagger
 * /statistics:
 *   get:
 *     summary: Récupérer les statistiques des rapports
 *     tags: [Rapports]
 *     responses:
 *       200:
 *         description: Statistiques des rapports récupérées avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalReports:
 *                   type: integer
 *                   example: 150
 *                 resolved:
 *                   type: integer
 *                   example: 75
 *                 pending:
 *                   type: integer
 *                   example: 50
 *                 inProgress:
 *                   type: integer
 *                   example: 25
 *       500:
 *         description: Erreur interne du serveur lors de la récupération des statistiques
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Erreur serveur lors de la récupération des statistiques"
 */
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