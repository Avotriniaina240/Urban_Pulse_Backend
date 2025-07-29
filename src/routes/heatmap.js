const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/pollution-points', async (req, res) => {
    console.log('Route /pollution-points appelée');
  try {
    const result = await pool.query(
      `SELECT id, nom, ST_X(geom) AS longitude, ST_Y(geom) AS latitude, valeur_pollution
       FROM mesures_pollution`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[Heatmap] Erreur lors de la récupération des points de pollution:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/pollution-zones', async (req, res) => {
    try {
      const result = await pool.query(`
        WITH clusters AS (
          SELECT id, nom, geom, valeur_pollution,
                 ST_ClusterDBSCAN(geom, eps := 0.01, minpoints := 3) OVER () AS cluster_id
          FROM mesures_pollution
        )
        SELECT cluster_id, 
               ST_X(ST_Centroid(ST_Collect(geom))) AS longitude,
               ST_Y(ST_Centroid(ST_Collect(geom))) AS latitude,
               COUNT(*) AS nb_points,
               AVG(valeur_pollution) AS avg_pollution
        FROM clusters
        WHERE cluster_id IS NOT NULL
        GROUP BY cluster_id;
      `);
      res.json(result.rows);
    } catch (err) {
      console.error('[Heatmap] Erreur récupération zones pollution:', err);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

module.exports = router;