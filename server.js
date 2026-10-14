require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http'); // 1. Importar o módulo http
const { Server } = require('socket.io'); // 2. Importar o Socket.io
const chatRoutes = require('./routes/chatRoutes');
const authRoutes = require('./routes/authRoutes');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app); // 3. Criar o servidor HTTP




// 4. Configurar o Socket.io com as mesmas regras de CORS do seu Express
const io = new Server(server, {
    cors: {
        origin: "*", // Ou coloque a URL do seu front-end para maior segurança
        methods: ["GET", "POST"]
    }
});




app.use(cors());
app.use(express.json());

// Conexão MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('📦 MongoDB Conectado'))
  .catch(err => console.error('Erro Mongo:', err));

// ROTAS
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

app.get('/', (req, res) => res.send('API Online! 🚀'));



io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Autenticação necessária: Token ausente."));
    }

    try {
        // Verifica o token usando o mesmo segredo do JWT do Express
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Salva as informações do usuário no objeto socket para uso futuro
        socket.usuario = decoded; 
        next();
    } catch (err) {
        return next(new Error("Autenticação falhou: Token inválido."));
    }
});
// 5. Configurar eventos do Socket.io
io.on('connection', (socket) => {
    console.log(`🔌 Novo cliente conectado: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
});


// Importe o controller para usar a função da IA
const chatController = require('./controllers/chatController');

io.on('connection', (socket) => {
    console.log(`🔌 Novo cliente conectado: ${socket.id}`);

    // Escuta evento de nova mensagem
    socket.on('novaMensagem', async (dados) => {
        // dados espera-se que contenha: { nickname: '...', texto: '...' }
        
        // 1. Espalha a mensagem para TODOS instantaneamente
        io.emit('mensagemRecebida', dados);

        // 2. Verifica se contém @gemini
        if (dados.texto && dados.texto.toLowerCase().includes('@gemini')) {
            console.log("🤖 IA acionada via socket por:", dados.nickname);
            
            // Chama a função da IA
            const respostaIA = await chatController.processarMensagemIA(dados.texto, dados.nickname);
            
            // 3. Emite a resposta do robô para todos
            io.emit('mensagemRecebida', {
                nickname: 'Guardião',
                texto: respostaIA,
                ehBot: true
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
});

const PORTA = process.env.PORT || 3000;
// 6. Usar 'server.listen' em vez de 'app.listen'
server.listen(PORTA, () => console.log(`🚀 Servidor na porta ${PORTA}`)); 