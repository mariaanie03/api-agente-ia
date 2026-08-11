const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // Busca o token no cabeçalho Authorization
    const authHeader = req.header('Authorization');

    if (!authHeader) {
        return res.status(401).json({ erro: "Acesso negado. Token não fornecido." });
    }

    // O formato padrão é "Bearer <TOKEN>", por isso limpamos o texto "Bearer "
    const token = authHeader.replace('Bearer ', '');

    try {
        const verificado = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = verificado; // Adiciona os dados do usuário logado na requisição
        next(); // Permite que a requisição continue para o próximo passo
    } catch (err) {
        res.status(401).json({ erro: "Token inválido ou expirado." });
    }
};