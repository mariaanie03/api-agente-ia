const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota: POST /api/auth/register
router.post('/register', authController.register);

// Rota: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;