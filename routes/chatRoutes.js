const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Define a rota POST
router.post('/', chatController.enviarChat);

router.delete('/limpar', chatController.limparChat);

module.exports = router;