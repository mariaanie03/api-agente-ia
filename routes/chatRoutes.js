const express = require('express');
const router = express.Router();
const multer = require('multer'); // Importando o Multer
const chatController = require('../controllers/chatController');
const autenticarToken = require('../middlewares/authMiddleware'); // Importando o segurança

// CONFIGURANDO MULTER (Armazenamento em Memória)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Protegemos a rota de enviar mensagens com o middleware de token
router.post('/', autenticarToken, chatController.enviarChat);

// NOVA ROTA: Upload de Documento + Pergunta
// O middleware upload.single('documento') intercepta o arquivo enviado
router.post('/documento', autenticarToken, upload.single('documento'), chatController.analisarDocumento);

// Rota de limpar chat e ranking
router.delete('/limpar', chatController.limparChat);
router.get('/ranking', chatController.obterRanking);

module.exports = router;