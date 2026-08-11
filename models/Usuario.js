const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
    nome: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true 
    },
    senha: { 
        type: String, 
        required: true 
    },
    xp: { 
        type: Number, 
        default: 0 
    }
});

// Middleware do Mongoose: Criptografa a senha antes de salvar
UsuarioSchema.pre('save', async function(next) {
    if (!this.isModified('senha')) return next();
    this.senha = await bcrypt.hash(this.senha, 10);
    next();
});

module.exports = mongoose.model('Usuario', UsuarioSchema);