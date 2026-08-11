const Mensagem = require('../models/Mensagem');
const Jogador = require('../models/Jogador'); // Importando o modelo de Jogador
const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- FASE 1: FUNÇÕES LOCAIS (AÇÕES) ---

// Função de Clima (Sprint anterior)
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

// NOVO: Função para Adicionar XP no MongoDB
async function adicionarXP(nickname, quantidade) {
    try {
        console.log(`🎮 Atualizando XP de ${nickname}: ${quantidade}`);
        
        // Procura o jogador pelo nome. Se não existir, o 'upsert' cria um novo.
        const jogadorAtualizado = await Jogador.findOneAndUpdate(
            { nome: nickname },
            { $inc: { xp: quantidade } }, // Incrementa o XP (ou retira se quantidade for negativa)
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

exports.enviarChat = async (req, res) => {
    try {
        const { pergunta, nickname } = req.body; // Recebendo Nickname do front
        if (!pergunta || !nickname) return res.status(400).json({ erro: "Nickname e Pergunta são obrigatórios." });

        await Mensagem.create({ role: "user", parts: [{ text: `[Jogador: ${nickname}] ${pergunta}` }] });

        const historico = await Mensagem.find().select('role parts -_id').sort({ dataHora: 1 }).limit(10);

        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            systemInstruction: instrucaoDoSistema, // Aplicando a Fase 3
            tools: [{ functionDeclarations: [declaracaoClima, declaracaoXP] }] // Aplicando a Fase 2
        });

        const chat = model.startChat({ history: historico });
        let result = await chat.sendMessage(pergunta);
        
        // LOOP DE EXECUÇÃO DE FUNÇÕES (AGENTE)
        const calls = result.response.functionCalls();
        
        if (calls && calls.length > 0) {
            const call = calls[0];
            let resultadoDaAcao;

            // Identifica qual função a IA quer chamar
            if (call.name === "buscarClimaTempoReal") {
                resultadoDaAcao = await buscarClimaTempoReal(call.args.cidade);
            } else if (call.name === "adicionarXP") {
                // Garante que a IA use o nickname correto enviado pelo front
                resultadoDaAcao = await adicionarXP(nickname, call.args.quantidade);
            }

            // Envia o resultado da função de volta para a IA finalizar o texto
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

// Limpar chat (mantém o mesmo)
exports.limparChat = async (req, res) => {
    await Mensagem.deleteMany({});
    res.status(200).json({ sucesso: true });
};
// Busca os 10 jogadores com mais XP
exports.obterRanking = async (req, res) => {
    try {
        const ranking = await Jogador.find()
            .sort({ xp: -1 }) // Ordena do maior XP para o menor
            .limit(10)        // Pega apenas os 10 primeiros
            .select('nome xp -_id'); // Retorna só nome e xp
        
        return res.status(200).json(ranking);
    } catch (erro) {
        console.error("Erro ao buscar ranking:", erro);
        return res.status(500).json({ erro: "Falha ao obter ranking." });
    }
};