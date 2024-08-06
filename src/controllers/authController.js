const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendResetEmail = require('../utils/email')


// Fonction pour générer un token de réinitialisation
function generateResetToken() {
  return crypto.randomBytes(20).toString('hex');
}

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Vérifier si l'email existe dans la base de données
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Générer un token de réinitialisation
    const resetToken = generateResetToken();

    let resetTokenExpires = new Date();
    
    // Ajoutez 15 minutes
    resetTokenExpires.setMinutes(resetTokenExpires.getMinutes() + 15);

    // Stocker le token et la date d'expiration dans la base de données
    await pool.query('UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3', [resetToken, resetTokenExpires.toDateString(), email]);

    // Envoyer l'email avec le lien de réinitialisation
    await sendResetEmail(email, resetToken);

    res.status(200).json({ message: 'Un lien de réinitialisation a été envoyé à votre email.' });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation.' });
  }
}

exports.resetPassword= async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Obtenir la date actuelle au format ISO 8601
    const currentTimestamp = new Date().toISOString();

    // Vérifier si le jeton est valide et non expiré
    const user = await pool.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > $2',
      [token, currentTimestamp]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({ message: 'Jeton invalide ou expiré.' });
    }

    // Mettre à jour le mot de passe en texte clair 
    await pool.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [password, user.rows[0].id]
    );

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
}

exports.loginController = async (req, res) => {
  const { email, password } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const user = userResult.rows[0];

    if (user.password !== password) {
      return res.status(400).json({ message: 'Identifiants invalides' });
    }

    const token = jwt.sign({ id: user.id }, 'your_jwt_secret', { expiresIn: '30d' });

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      token,
      message: user.role === 'admin' ? 'Admin Connecté!' :
               user.role === 'urbanist' ? 'Urbaniste Connecté!' :
               'Utilisateur Connecté!',
      redirect: user.role === 'admin' ? '/admin-dashboard' :
                user.role === 'urbanist' ? '/urbanist-dashboard' :
                '/user-dashboard'
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
}

exports.registerController = async (req, res) => {
  const { email, password, username, role = 'citizen' } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length > 0) {
      return res.status(400).json({ message: 'L\'utilisateur existe déjà' });
    }

    const result = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, password, role]
    );

    const newUser = result.rows[0];
    res.status(201).json({ id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erreur serveur');
  }
}