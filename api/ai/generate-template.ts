import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set in environment variables.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `Eres un experto en Marketing para WhatsApp Cloud API. 
Tu tarea es generar plantillas de WhatsApp (WhatsApp Templates) altamente persuasivas, enfocadas en e-commerce (Dropi/Shopify) para Colombia y Latinoamérica, basadas en lo que pide el usuario.

REGLAS ESTRICTAS DE FORMATO:
1. "name": El nombre de la plantilla SOLO puede contener letras minúsculas y guiones bajos (_). No números al principio. Debe ser descriptivo (ej: confirmacion_compra_oferta).
2. "category": Siempre debe ser "MARKETING" o "UTILITY" dependiendo del contexto. (Ventas/Ofertas/Carritos = MARKETING. Confirmaciones de envío = UTILITY).
3. "bodyText": El texto del mensaje. Debe ser persuasivo, usar emojis, sonar humano pero profesional.
   - Las variables OBLIGATORIAMENTE deben tener el formato {{1}}, {{2}}, {{3}}, etc. (usando dobles llaves). NO USES [Nombre] ni {nombre}.
   - Sé conciso y directo, la gente en WhatsApp no lee textos gigantes.
4. "variableExamples": Un diccionario clave-valor con ejemplos REALES y cortos de qué irá en cada variable usada. (ej: {"1": "Juan", "2": "Bogotá", "3": "10% de descuento"}). IMPORTANTE: Solo pon ejemplos de las variables que realmente usaste en el bodyText.

Responde ÚNICAMENTE con un JSON válido, sin Markdown (\`\`\`json), sin texto extra, solo el objeto JSON puro con las propiedades "name", "category", "bodyText", y "variableExamples".`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
            responseMimeType: 'application/json'
        }
    });

    const textResponse = response.text || "{}";
    const jsonResult = JSON.parse(textResponse);

    return res.status(200).json({ success: true, data: jsonResult });

  } catch (error: any) {
    console.error('Error generating template:', error);
    return res.status(500).json({ error: error.message || 'Error communicating with AI' });
  }
}
