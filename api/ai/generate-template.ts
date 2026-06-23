import type { VercelRequest, VercelResponse } from '@vercel/node';
import { routeAIRequest } from '../utils/ai-router.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt, organizationId } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (!organizationId) {
      return res.status(400).json({ error: 'organizationId is required' });
    }

    const systemInstruction = `Eres un experto redactor de marketing para WhatsApp. El usuario te dará una idea para un mensaje y tú debes redactar una plantilla oficial de WhatsApp Business.
Debes devolver el resultado como un JSON con esta estructura exacta:
{
  "name": "nombre_de_plantilla_en_minusculas_y_guiones_bajos",
  "category": "MARKETING" o "UTILITY",
  "bodyText": "El texto persuasivo del mensaje. Usa variables como {{1}}, {{2}} donde sea necesario inyectar nombres, precios o fechas.",
  "variableExamples": {
    "1": "Juan",
    "2": "50% de descuento"
  }
}
Importante: "variableExamples" debe ser un mapa llave-valor simple. Si usas 2 variables, debe haber 2 llaves de ejemplo en el objeto.
Responde ÚNICAMENTE con un JSON válido, sin Markdown (\`\`\`json), sin texto extra, solo el objeto JSON puro.`;

    const aiOutput = await routeAIRequest({
      organizationId,
      module: 'templates',
      systemPrompt: systemInstruction,
      messages: [{ role: 'user', content: prompt }],
      requireJson: true
    });

    let cleanedOutput = aiOutput.trim() || '{}';
    if (cleanedOutput.startsWith('```')) {
      cleanedOutput = cleanedOutput.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/i, '').trim();
    }

    const jsonResult = JSON.parse(cleanedOutput);
    return res.status(200).json({ success: true, data: jsonResult });

  } catch (error: any) {
    console.error('AI Router Error:', error);
    return res.status(500).json({ error: error.message || 'Error comunicándose con la IA' });
  }
}
