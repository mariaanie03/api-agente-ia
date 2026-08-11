const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const autenticarToken = require('../middlewares/authMiddleware'); // Importando o segurança

// Protegemos a rota de enviar mensagens com o middleware de token
router.post('/', autenticarToken, chatController.enviarChat);

// Rota de limpar chat e ranking (podem ser públicas ou protegidas também)
router.delete('/limpar', chatController.limparChat);
router.get('/ranking', chatController.obterRanking);

module.exports = router;