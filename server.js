// 1. Importações
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const chatRoutes = require('./routes/chatRoutes');

// 2. Inicialização do Express
const app = express();

// 3. Middlewares
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 4. Conexão com o Banco de Dados (COM LOG DE DIAGNÓSTICO)
console.log("🔍 Diagnóstico: Iniciando tentativa de conexão com o banco...");

if (!process.env.MONGO_URI) {
    console.error("❌ ERRO: A variável MONGO_URI não está definida no ambiente!");
} else {
    console.log("✅ MONGO_URI encontrada no ambiente.");
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
      console.log('📦 Conectado ao MongoDB Atlas com sucesso!');
  })
  .catch((err) => {
      console.error('❌ ERRO CRÍTICO NA CONEXÃO COM O BANCO DE DADOS:');
      console.error(err.message);
  });

// 5. Definição das Rotas
app.use('/api/chat', chatRoutes);

// Rota de teste
app.get('/', (req, res) => {
    res.send('Servidor do Chatbot está rodando! 🚀');
});

// 6. Definição da Porta
const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log(`🚀 Servidor rodando na porta ${PORTA}`);
});