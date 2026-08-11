const mongoose = require('mongoose');

const JogadorSchema = new mongoose.Schema({
    nome: { 
        type: String, 
        required: true, 
        unique: true, // Garante que não existam dois jogadores com o mesmo nome
        trim: true 
    },
    xp: { 
        type: Number, 
        default: 0 // Todo jogador começa com 0 de experiência
    },
    dataCadastro: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Jogador', JogadorSchema);