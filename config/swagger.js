const swaggerJSDoc = require('swagger-jsdoc');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0', 
    info: {
      title: 'UrbanPulse API Documentation',
      version: '1.0.0',
      description: 'API Documentation for the UrbanPulse project',
      contact: {
        name: 'Avotriniaina',
        url: 'http://localhost:3000',
        email: 'rabotosonavotriniaina@gmail.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Local server',
      },
    ],
  },

  apis: ['./src/**/*.js'],
};

const swaggerDocs = swaggerJSDoc(swaggerOptions);

module.exports = swaggerDocs;