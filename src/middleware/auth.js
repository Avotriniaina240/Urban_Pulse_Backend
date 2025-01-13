const jwt = require("jsonwebtoken")
const pool = require('../db');

// Middleware d'authentification
exports.authenticateToken = async (req, res, next) => {
  const authorization = req.headers['authorization'];
  if (!authorization || !authorization.startsWith("Bearer")) {
    return res.status(401).send('Accès refusé'); // Vérifiez bien si l'en-tête est présent
  }

  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).send('Jeton invalide'); // Si le token est invalide
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
};
