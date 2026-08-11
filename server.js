require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes'); // IMPORTANDO ROTAS DE AUTH

const app = express();

app.use(cors());
app.use(express.json());

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 MongoDB Conectado'))
  .catch(err => console.error('Erro Mongo:', err));

// ROTAS
app.use('/api/auth', authRoutes); // Novas rotas de Cadastro/Login
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => res.send('API Online! 🚀'));

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => console.log(`🚀 Servidor na porta ${PORTA}`));