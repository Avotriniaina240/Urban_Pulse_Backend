const express = require('express');
const {deleteAdmin} = require('../controllers/admincontroller')

const router = express.Router();

// Route pour supprimer un utilisateur (accessible uniquement aux admins)
router.delete('/users/:id', authenticateToken, checkAdmin, deleteAdmin);

module.exports = router