const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('../config/swagger');

const app = express();
const routes = require('./server');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'projet_urban_pulse'
});

client.connect()
  .then(() => console.log('PostgreSQL connected'))
  .catch(err => console.error('PostgreSQL connection error:', err));

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Utiliser les routes définies
app.use('/api/', routes);

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.listen(5000, () => {
  console.log('Server running on port 5000');
  console.log('Swagger Docs available at http://localhost:5000/api-docs');
});
