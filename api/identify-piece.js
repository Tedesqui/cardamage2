import OpenAI from 'openai';

// Inicializa o cliente da OpenAI com a chave de API configurada na Vercel
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// A Vercel executa esta função para cada requisição recebida
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Method Not Allowed' });
    }

    const { image } = request.body;

    if (!image) {
        return response.status(400).json({ error: 'A imagem é obrigatória.' });
    }

    // --- PROMPT DETALHADO PARA IDENTIFICAR PEÇA E MODELO ---
    // Pede para a IA focar na peça principal e também no modelo do carro.
    const prompt = `
    Analise a imagem focando na peça de veículo em destaque.
    Sua tarefa é identificar duas coisas:
    1. A peça principal na imagem (ex: "retrovisor direito", "pneu dianteiro", "para-choque", "farol", "porta do motorista").
    2. O modelo e a marca do veículo ao qual a peça pertence (ex: "Honda Civic", "Fiat Strada", "Hyundai HB20").

    Formate sua resposta final estritamente como um objeto JSON com duas chaves:
    - "pecaIdentificada": uma string com o nome da peça (ex: "Retrovisor direito").
    - "modeloVeiculo": uma string com a marca e modelo do veículo (ex: "Honda Civic").

    Se não conseguir identificar a peça ou o modelo do veículo, o valor da chave correspondente deve ser null.
    Não inclua nada na sua resposta além do objeto JSON.
  `;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4-vision-preview",
            response_format: { type: "json_object" },
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        { type: "image_url", image_url: { "url": image } },
                    ],
                },
            ],
            max_tokens: 800,
        });

        const aiResultString = completion.choices[0].message.content;
        const parsedResult = JSON.parse(aiResultString);

        // Retorna um objeto JSON para o frontend com a peça e o modelo
        return response.status(200).json({
            pecaIdentificada: parsedResult.pecaIdentificada,
            modeloVeiculo: parsedResult.modeloVeiculo
        });

    } catch (error) {
        console.error('Erro na chamada da API da OpenAI ou no parse do JSON:', error);
        return response.status(500).json({ error: 'Falha ao se comunicar com a IA ou processar a resposta.' });
    }
}