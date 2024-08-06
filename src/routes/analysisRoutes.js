// src/routes/analysisRoutes.js
const express = require('express');
const router = express.Router();
const { Client } = require('pg');

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'chris06',
    database: 'Projet_urban_pulse'
});

client.connect().catch(err => console.error('PostgreSQL connection error:', err));

// Route pour récupérer les données de qualité de l'air
router.get('/air-quality', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM air_quality ORDER BY timestamp DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des données de qualité de l\'air.' });
    }
});

// Route pour récupérer les données de circulation
router.get('/traffic-data', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM traffic_data ORDER BY timestamp DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des données de circulation.' });
    }
});

// Route pour récupérer les données de criminalité
router.get('/crime-data', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM crime_data ORDER BY timestamp DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Erreur lors de la récupération des données de criminalité.' });
    }
});

module.exports = router;
