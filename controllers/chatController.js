const Mensagem = require('../models/Mensagem');
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Inicializa a API do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.enviarChat = async (req, res) => {
    try {
        const { pergunta } = req.body;
        console.log("📥 Pergunta recebida:", pergunta);

        if (!pergunta) {
            return res.status(400).json({ erro: "Envie uma pergunta." });
        }

        // 1. Salva a pergunta
        await Mensagem.create({ role: "user", parts: [{ text: pergunta }] });

        // 2. Busca histórico
        const historico = await Mensagem.find()
                                        .select('role parts -_id') 
                                        .sort({ dataHora: 1 })
                                        .limit(20);

        // 3. Conecta com a IA
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const chat = model.startChat({ history: historico });

        // 4. Envia mensagem
        const result = await chat.sendMessage(pergunta);
        const respostaDaIA = result.response.text();
        
        console.log("🤖 Resposta da IA gerada com sucesso!");

        // 5. Salva a resposta
        await Mensagem.create({ role: "model", parts: [{ text: respostaDaIA }] });

        return res.status(200).json({ sucesso: true, resposta: respostaDaIA });

    } catch (erro) {
        console.error("❌ ERRO NO BACK-END:", erro);
        return res.status(500).json({ 
            erro: "Erro interno no servidor.", 
            detalhe: erro.message 
        });
    }
};

exports.limparChat = async (req, res) => {
    try {
        console.log("🧹 Limpando histórico do banco de dados...");
        await Mensagem.deleteMany({});
        return res.status(200).json({ sucesso: true, mensagem: "Histórico apagado!" });
    } catch (erro) {
        console.error("❌ Erro ao limpar:", erro);
        return res.status(500).json({ erro: "Não foi possível limpar." });
    }
};