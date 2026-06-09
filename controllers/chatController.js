const Mensagem = require('../models/Mensagem');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.enviarChat = async (req, res) => {
    try {
        const { pergunta } = req.body;
        if (!pergunta) return res.status(400).json({ erro: "Envie uma pergunta." });

        await Mensagem.create({ role: "user", parts: [{ text: pergunta }] });

        const historico = await Mensagem.find()
                                        .select('role parts -_id') 
                                        .sort({ dataHora: 1 })
                                        .limit(20);

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({ history: historico });

        const result = await chat.sendMessage(pergunta);
        const respostaDaIA = result.response.text();

        await Mensagem.create({ role: "model", parts: [{ text: respostaDaIA }] });

        return res.status(200).json({ sucesso: true, resposta: respostaDaIA });
    } catch (erro) {
        console.error("❌ Erro no Controller:", erro);
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
};

exports.limparChat = async (req, res) => {
    try {
        await Mensagem.deleteMany({}); // Apaga todos os documentos da coleção
        return res.status(200).json({ sucesso: true, mensagem: "Histórico apagado com sucesso!" });
    } catch (erro) {
        console.error("❌ Erro ao limpar histórico:", erro);
        return res.status(500).json({ erro: "Não foi possível limpar o histórico." });
    }
};
