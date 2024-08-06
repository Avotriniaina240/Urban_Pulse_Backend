const express = require('express');
const {loginController, registerController,forgotPassword, resetPassword} = require('../controllers/authController')

const router = express.Router();

router.post('/login', loginController)
router.post('/register', registerController)

// Route pour demander la réinitialisation du mot de passe
router.post('/forgot-password',forgotPassword );
  
  router.post('/reset-password/:token', resetPassword);
  

module.exports = router