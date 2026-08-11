const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// CADASTRO DE NOVO USUÁRIO
exports.register = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;
        
        // Verifica se o e-mail já existe
        const usuarioExiste = await Usuario.findOne({ email });
        if (usuarioExiste) {
            return res.status(400).json({ erro: "Este e-mail já está cadastrado." });
        }

        const novoUsuario = await Usuario.create({ nome, email, senha });
        res.status(201).json({ sucesso: true, mensagem: "Usuário criado com sucesso!" });
    } catch (err) {
        console.error("Erro no registro:", err);
        res.status(500).json({ erro: "Erro ao registrar usuário." });
    }
};

// LOGIN DE USUÁRIO
exports.login = async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            return res.status(401).json({ erro: "Usuário não encontrado." });
        }

        // Compara a senha digitada com a criptografada
        const senhaValida = await bcrypt.compare(senha, usuario.senha);
        if (!senhaValida) {
            return res.status(401).json({ erro: "Senha incorreta." });
        }

        // Gera o Token JWT (Dura 24 horas)
        const token = jwt.sign(
            { id: usuario._id, nome: usuario.nome },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            sucesso: true, 
            token, 
            nome: usuario.nome 
        });
    } catch (err) {
        console.error("Erro no login:", err);
        res.status(500).json({ erro: "Erro ao realizar login." });
    }
};