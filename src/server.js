const express = require('express');
const router = express.Router();
const pool = require('./db');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurer Nodemailer pour envoyer des emails
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  }
});

// Fonction pour générer un token de réinitialisation
function generateResetToken() {
  return crypto.randomBytes(20).toString('hex');
}

// Envoyer un email de réinitialisation
async function sendResetEmail(email, token) {
  const mailOptions = {
    from: 'rabotosonavotriniaina@gmail.com',
    to: email,
    subject: 'Réinitialisation du mot de passe',
    text: `Vous recevez cet email car vous avez demandé la réinitialisation du mot de passe de votre compte.\n\n
           Cliquez sur le lien suivant pour réinitialiser votre mot de passe:\n\n
           http://localhost:3000/reset-password/${token}\n\n
           Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email et votre mot de passe restera inchangé.\n`
  };

  await transporter.sendMail(mailOptions);
}

// Route pour demander la réinitialisation du mot de passe
router.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    // Vérifier si l'email existe dans la base de données
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (user.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Générer un token de réinitialisation
    const resetToken = generateResetToken();
    const resetTokenExpires = Date.now() + 3600000; // 1 heure

    // Stocker le token et la date d'expiration dans la base de données
    await pool.query('UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE email = $3', [resetToken, resetTokenExpires, email]);

    // Envoyer l'email avec le lien de réinitialisation
    await sendResetEmail(email, resetToken);

    res.status(200).json({ message: 'Un lien de réinitialisation a été envoyé à votre email.' });
  } catch (error) {
    console.error('Erreur lors de la demande de réinitialisation:', error);
    res.status(500).json({ message: 'Erreur lors de la demande de réinitialisation.' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
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

    // Mettre à jour le mot de passe en texte clair (sans hachage pour l'exemple)
    await pool.query(
      'UPDATE users SET password = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [password, user.rows[0].id]
    );

    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation du mot de passe.' });
  }
});




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
