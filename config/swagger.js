const swaggerJSDoc = require('swagger-jsdoc');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0', 
    info: {
      title: 'UrbanPulse API Documentation',
      version: '1.0.0',
      description: 'API Documentation for the UrbanPulse project',
      contact: {
        name: 'Avotra',
        url: 'https://votre-site.com',
        email: 'support@votre-site.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local server',
      },
    ],
  },

  apis: ['./src/server.js'], 
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

module.exports = swaggerDocs;