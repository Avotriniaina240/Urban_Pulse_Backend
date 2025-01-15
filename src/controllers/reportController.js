const reportModel = require('../models/reportModel');

exports.submitReport = async (req, res) => {
  const { description, location } = req.body;
  const image = req.file;
  const status = 'soumis'; // Changé de 'pending' à 'soumis'
  const user_id = req.user.id;

  if (!description || !location) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  try {
    const report = await reportModel.createReport(description, location, image, status, user_id);
    res.status(201).json({ message: 'Rapport soumis avec succès', report });
  } catch (err) {
    console.error('Erreur lors de la soumission du rapport:', err);
    res.status(500).json({ message: 'Erreur lors de la soumission du rapport: ' + err.message });
  }
};