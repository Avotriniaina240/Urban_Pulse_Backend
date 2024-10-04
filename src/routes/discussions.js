const express = require('express');
const router = express.Router();
const { createDiscussion } = require('../controllers/discussionController');


router.post('/', createDiscussion);

// Route pour récupérer toutes les discussions
router.get('/', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM discussions');
      res.json(result.rows); // Renvoie toutes les discussions
    } catch (error) {
      console.error('Erreur lors de la récupération des discussions:', error);
      res.status(500).send('Erreur lors de la récupération des discussions');
    }
  });

module.exports = router;