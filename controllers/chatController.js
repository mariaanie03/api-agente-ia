const Mensagem = require('../models/Mensagem');
const Jogador = require('../models/Jogador');
const pdfParse = require('pdf-parse'); 
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- FASE 1: FUNÇÕES LOCAIS (AÇÕES) ---

async function buscarClimaTempoReal(cidade) {
    const apiKey = process.env.WEATHER_API_KEY; 
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)}&appid=${apiKey}&units=metric&lang=pt_br`;
    try {
        const resposta = await fetch(url);
        const dados = await resposta.json();
        if (dados.cod !== 200) return { erro: "Cidade não encontrada." };
        return { temperatura: `${Math.round(dados.main.temp)}°C`, clima: dados.weather[0].description, cidade: dados.name };
    } catch (e) { return { erro: "Serviço offline." }; }
}

async function adicionarXP(nickname, quantidade) {
    try {
        console.log(`🎮 Atualizando XP de ${nickname}: ${quantidade}`);
        const jogadorAtualizado = await Jogador.findOneAndUpdate(
            { nome: nickname },
            { $inc: { xp: quantidade } },
            { upsert: true, new: true } 
        );
        return { sucesso: true, mensagem: `XP de ${nickname} agora é ${jogadorAtualizado.xp}` };
    } catch (erro) {
        console.error("Erro ao atualizar XP:", erro);
        return { erro: "Falha ao acessar banco de dados de jogadores." };
    }
}

// --- FASE 2: DECLARAÇÃO DAS FERRAMENTAS (JSON SCHEMA) ---

const declaracaoClima = {
    name: "buscarClimaTempoReal",
    description: "Obtém o clima de uma cidade.",
    parameters: {
        type: "OBJECT",
        properties: { cidade: { type: "STRING" } },
        required: ["cidade"]
    }
};

const declaracaoXP = {
    name: "adicionarXP",
    description: "Adiciona ou remove pontos de experiência (XP) de um jogador. Use 50 para acerto e -10 para quando o usuário pedir a resposta.",
    parameters: {
        type: "OBJECT",
        properties: {
            nickname: { type: "STRING", description: "O apelido do jogador." },
            quantidade: { type: "NUMBER", description: "A quantidade de XP a adicionar (positivo) ou remover (negativo)." }
        },
        required: ["nickname", "quantidade"]
    }
};

// --- FASE 3: CONFIGURAÇÃO DO GUARDIÃO (SYSTEM PROMPT) ---

const instrucaoDoSistema = `
Você é o Guardião do Cofre do Conhecimento. 
Seu objetivo é propor charadas curtas sobre tecnologia, programação e hardware.
REGRAS DO JOGO:
1. Se o usuário acertar a charada, você DEVE obrigatoriamente chamar a função 'adicionarXP' com 50 pontos.
2. Se o usuário pedir a resposta ou desistir, você DEVE chamar a função 'adicionarXP' com -10 pontos.
3. Se o usuário perguntar o clima, você pode usar a função de clima.
4. Sempre trate o usuário pelo nickname fornecido.
5. Nunca diga o XP total do usuário, apenas confirme que ele ganhou ou perdeu pontos.
6. Seja misterioso e divertido.
`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Função de Chat normal (O Guardião com as Charadas)
exports.enviarChat = async (req, res) => {
    try {
        const { pergunta, nickname } = req.body;
        if (!pergunta || !nickname) return res.status(400).json({ erro: "Nickname e Pergunta são obrigatórios." });

        await Mensagem.create({ role: "user", parts: [{ text: `[Jogador: ${nickname}] ${pergunta}` }] });

        const historico = await Mensagem.find().select('role parts -_id').sort({ dataHora: 1 }).limit(10);

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: instrucaoDoSistema,
            tools: [{ functionDeclarations: [declaracaoClima, declaracaoXP] }]
        });

        const chat = model.startChat({ history: historico });
        let result = await chat.sendMessage(pergunta);
        
        const calls = result.response.functionCalls();
        
        if (calls && calls.length > 0) {
            const call = calls[0];
            let resultadoDaAcao;

            if (call.name === "buscarClimaTempoReal") {
                resultadoDaAcao = await buscarClimaTempoReal(call.args.cidade);
            } else if (call.name === "adicionarXP") {
                resultadoDaAcao = await adicionarXP(nickname, call.args.quantidade);
            }

            const resultFinal = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: { content: resultadoDaAcao }
                }
            }]);

            var respostaFinalTexto = resultFinal.response.text();
        } else {
            var respostaFinalTexto = result.response.text();
        }

        await Mensagem.create({ role: "model", parts: [{ text: respostaFinalTexto }] });
        return res.status(200).json({ sucesso: true, resposta: respostaFinalTexto });

    } catch (erro) {
        console.error("Erro Crítico:", erro);
        res.status(500).json({ erro: "Erro no Guardião." });
    }
};

// NOVA FUNÇÃO: Analisar Documento PDF com RAG Estrito
exports.analisarDocumento = async (req, res) => {
    try {
        const { pergunta, nickname } = req.body;

        // Validações
        if (!pergunta || !nickname) {
            return res.status(400).json({ erro: "Nickname e Pergunta são obrigatórios." });
        }
        if (!req.file || req.file.mimetype !== 'application/pdf') {
            return res.status(400).json({ erro: "Um arquivo PDF válido é obrigatório." });
        }

        // 1. Extraindo texto do PDF
        const pdfData = await pdfParse(req.file.buffer);
        const textoExtraidoDoPDF = pdfData.text; // Captura o texto do PDF

        console.log(`📜 PDF processado para ${nickname}. Páginas: ${pdfData.numpages}`);

        // Salva a pergunta e o aviso de envio de arquivo no histórico do MongoDB
        await Mensagem.create({ role: "user", parts: [{ text: `[Jogador: ${nickname} enviou um PDF] ${pergunta}` }] });

        // 2. O SUPER PROMPT (RAG) - Evitando Alucinações
        const promptRAG = `
Você é um analista de dados corporativo extremamente preciso.
Abaixo está um documento de referência. Responda à pergunta do usuário baseando-se APENAS no texto fornecido.
Se a resposta não estiver no texto, diga exatamente: "Desculpe, não encontrei essa informação no documento." NÃO INVENTE DADOS.

DOCUMENTO:
"""
${textoExtraidoDoPDF}
"""

PERGUNTA DO USUÁRIO: ${pergunta}
`;

        // 3. Enviando para o Gemini
        // Perceba que aqui NÃO estamos usando o "instrucaoDoSistema" do Guardião.
        // O escopo desta rota é puramente analisar o PDF focado em precisão.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(promptRAG);
        const respostaFinalTexto = result.response.text();

        // 4. Salvando a resposta do Bot e retornando
        await Mensagem.create({ role: "model", parts: [{ text: respostaFinalTexto }] });
        return res.status(200).json({ sucesso: true, resposta: respostaFinalTexto });

    } catch (erro) {
        console.error("Erro ao processar documento:", erro);
        return res.status(500).json({ erro: "Falha ao ler o PDF ou se comunicar com a IA." });
    }
};

exports.limparChat = async (req, res) => {
    await Mensagem.deleteMany({});
    res.status(200).json({ sucesso: true });
};

exports.obterRanking = async (req, res) => {
    try {
        const ranking = await Jogador.find()
            .sort({ xp: -1 }) 
            .limit(10)        
            .select('nome xp -_id'); 
        
        return res.status(200).json(ranking);
    } catch (erro) {
        console.error("Erro ao buscar ranking:", erro);
        return res.status(500).json({ erro: "Falha ao obter ranking." });
    }
};