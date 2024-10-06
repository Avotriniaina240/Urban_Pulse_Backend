const express = require('express');
const router = express.Router();
const { addComment } = require('../controllers/commentController'); 
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, addComment);

module.exports = router;