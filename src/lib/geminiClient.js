const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const analyzePlantImage = async (base64Image) => {
  if (!GEMINI_API_KEY) {
    console.error("VITE_GEMINI_API_KEY não está configurada!");
    return { error: "Chave da API não configurada." };
  }

  // Remove o prefixo data:image/jpeg;base64, se existir
  const base64Data = base64Image.split(',')[1] || base64Image;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const prompt = `Você é a "Berry Grow AI", uma assistente de diagnóstico agrícola.
Analise a imagem fornecida.
1. Primeiro, verifique se a imagem contém uma planta, folha, fruto, flor ou raiz.
2. Se NÃO contiver uma planta (por exemplo, se for um teclado, um rosto humano, um carro, ou qualquer objeto não relacionado a plantas), retorne EXATAMENTE este JSON:
{
  "valido": false,
  "mensagem": "A imagem não parece ser de uma planta. Por favor, tire foto de uma folha, fruto ou raiz."
}
3. Se a imagem contiver uma planta, faça um diagnóstico completo focado em saúde agrícola (deficiências, pragas, doenças ou se está saudável).
Retorne EXATAMENTE este JSON:
{
  "valido": true,
  "titulo": "Nome do diagnóstico (ex: Deficiência de Cálcio, Planta Saudável, etc)",
  "gravidade": "Baixa" | "Média" | "Alta" | "Saudável",
  "confianca": 95,
  "recomendacao": "Recomendação técnica do que o produtor deve fazer.",
  "causas": ["Causa 1", "Causa 2"]
}

NÃO retorne formatação markdown como \`\`\`json, retorne apenas o JSON limpo.`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Erro da API Gemini:", data.error);
      return { error: data.error.message };
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Limpa a resposta caso venha com formatação markdown
    const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanedText);
      return parsed;
    } catch (e) {
      console.error("Erro ao parsear JSON do Gemini:", text);
      return { error: "Formato de resposta inválido da IA." };
    }

  } catch (err) {
    console.error("Erro na requisição para o Gemini:", err);
    return { error: "Falha na comunicação com a IA." };
  }
};
