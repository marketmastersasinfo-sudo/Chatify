import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not set in environment variables.' });
  }
  
  try {
    const openai = new OpenAI({ apiKey });
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const systemInstruction = `Eres un experto redactor de marketing para WhatsApp. El usuario te dará una idea para un mensaje y tú debes redactar una plantilla oficial de WhatsApp Business.
Debes devolver el resultado como un JSON con esta estructura exacta:
{
  "name": "nombre_de_plantilla_en_minusculas_y_guiones_bajos",
  "category": "MARKETING" o "UTILITY",
  "bodyText": "El texto persuasivo del mensaje. Usa variables como {{1}}, {{2}} donde sea necesario inyectar nombres, precios o fechas.",
  "variableExamples": {
    "body_text": [
      ["Juan", "50% de descuento"]
    ]
  }
}
Importante: "variableExamples.body_text" debe ser un array que contenga un array con ejemplos reales de palabras para las variables {{1}}, {{2}} etc que hayas usado en "bodyText". Si usas 2 variables, debe haber 2 palabras de ejemplo en el array interno.
Responde ÚNICAMENTE con un JSON válido, sin Markdown (\`\`\`json), sin texto extra, solo el objeto JSON puro.`;

    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
    });

    const textResponse = response.choices[0]?.message?.content || "{}";
    const jsonResult = JSON.parse(textResponse);

    return res.status(200).json({ success: true, data: jsonResult });

  } catch (error: any) {
    console.error('OpenAI Error:', error);
    return res.status(500).json({ error: error.message || 'Error comunicándose con OpenAI' });
  }
}
