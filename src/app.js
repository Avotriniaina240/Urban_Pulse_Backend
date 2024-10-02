const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const routes = require('./server');

const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres', 
    password: 'chris06',
    database: 'Projet_urban_pulse'
});

client.connect()
    .then(() => console.log('PostgreSQL connected'))
    .catch(err => console.error('PostgreSQL connection error:', err));

// Middleware
app.use(cors());
app.use(express.json()); // Middleware pour parser le JSON

app.use('/uploads', express.static(path.join(__dirname,'..', 'uploads')));


// Utiliser les routes définies
app.use('/api/', routes);

app.listen(5000, () => {
  console.log('Server running on port 5000');
});


