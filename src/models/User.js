const { Sequelize, DataTypes } = require('sequelize');

// Création d'une instance de Sequelize
const sequelize = new Sequelize('postgres://postgres:chris06@localhost:5432/Projet_urban_pulse', {
  dialect: 'postgres',
  logging: console.log, // Affiche les requêtes dans la console pour le débogage
});

// Définition du modèle User avec les noms d'attributs corrects
const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  reset_password_token: {
    type: DataTypes.STRING(255), // varchar(255)
  },
  reset_password_expires: {
    type: DataTypes.DATE, // timestamp without time zone
  },
  profile_picture_url: {
    type: DataTypes.TEXT, // Utilisez TEXT pour les longues chaînes Base64
    allowNull: true, // Permettre la valeur nulle si l'utilisateur n'a pas d'image
  },
}, {
  tableName: 'users', // Spécifiez le nom exact de la table ici
  timestamps: true, // Active les colonnes createdAt et updatedAt
  createdAt: 'created_at', // Spécifie le nom de la colonne pour createdAt
  updatedAt: 'updated_at', // Spécifie le nom de la colonne pour updatedAt
});

// Exporter le modèle
module.exports = User;
