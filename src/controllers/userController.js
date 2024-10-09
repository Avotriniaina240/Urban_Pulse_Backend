const pool = require('../db');

// Fonction pour mettre à jour l'image de profil
exports.updateProfilePicture = async (req, res) => {
  const userId = req.params.id;
  const { profilePictureBase64 } = req.body; // Récupère l'image en Base64 du corps de la requête

  // Vérifie si le champ Base64 est présent
  if (!profilePictureBase64) {
    return res.status(400).json({ message: 'Image en Base64 manquante' });
  }

  try {
    // Met à jour l'URL de l'image dans la base de données
    await pool.query(
      'UPDATE users SET profile_picture_url = $1 WHERE id = $2',
      [profilePictureBase64, userId]
    );

    res.status(200).json({ message: 'Image de profil mise à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'image de profil:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la mise à jour de l\'image de profil' });
  }
};


// Fonction pour obtenir les informations d'un utilisateur
exports.getUserById = async (req, res) => {
  const userId = req.params.id; 

  try {
    const result = await pool.query('SELECT id, username, email, phone_number, address, date_of_birth AS "dateOfBirth", profile_picture_url AS "profilePictureUrl", role FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.status(200).json(result.rows[0]); // Retourne les informations de l'utilisateur
  } catch (error) {
    console.error('Erreur lors de la récupération des informations utilisateur:', error.message);
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des informations utilisateur' });
  }
};
