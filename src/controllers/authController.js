const express = require('express');
const pool = require('../db');
const jwt = require('jsonwebtoken');

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