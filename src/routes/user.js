const express = require('express');
const router = express.Router();
const { getUserById } = require('../controllers/userController');
const { authenticateToken } = require('../middleware/auth');

// Route GET pour obtenir les informations de l'utilisateur
router.get('/users/:id', authenticateToken, getUserById);

module.exports = router;