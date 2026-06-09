// 1. Importações
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const chatRoutes = require('./routes/chatRoutes');

// 2. Inicialização do Express
const app = express();

// 3. Middlewares (A ordem importa!)
// O CORS deve ser configurado antes das rotas para liberar o acesso ao front-end
app.use(cors({
    origin: '*', // Permite conexões de qualquer origem (útil para testes)
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); // Permite que o servidor entenda JSON

// 4. Conexão com o Banco de Dados
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 Conectado ao MongoDB Atlas!'))
  .catch((err) => console.error('❌ Erro no banco:', err));

// 5. Definição das Rotas
// Agora o server.js fica limpo, apenas apontando para o arquivo de rotas
app.use('/api/chat', chatRoutes);

// Rota de teste simples para saber se o servidor está no ar
app.get('/', (req, res) => {
    res.send('Servidor do Chatbot está rodando! 🚀');
});

// 6. Definição da Porta
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});