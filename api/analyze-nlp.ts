import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { routeAIRequest } from './utils/ai-router.js';

export const maxDuration = 60;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { productName, messages, modelProvider, organizationId } = req.body;

    if (!productName || !messages || messages.length === 0) {
      return res.status(400).json({ error: 'Missing product or messages data.' });
    }
    
    // Fallback: If organizationId is missing (from older frontend), we fetch the first one like before
    let targetOrgId = organizationId;
    if (!targetOrgId) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      targetOrgId = orgData?.id;
    }

    if (!targetOrgId) {
       return res.status(400).json({ error: 'No organization found.' });
    }

    const chatsList = messages.map((m: any, i: number) => `Chat ${i+1}: "${m.content}"`).join('\n');
    
    const systemPrompt = `Eres un experto en e-commerce, Data Science y optimización de conversión (CRO).
El dueño de la tienda está analizando por qué los clientes abandonan la compra del producto "${productName}".
Aquí tienes el historial real de decenas de chats de clientes que NO compraron o que dudaron:

${chatsList}

Tu tarea es analizar el dolor emocional, la verdadera intención de compra y las objeciones subyacentes.

DEBES responder ÚNICAMENTE con un objeto JSON con este formato exacto (sin markdown \`\`\`json):
{
  "words": [
    { "word": "Dolor Prostático", "count": 15 },
    { "word": "Desconfianza Envío", "count": 8 }
  ],
  "landing_plan": "Escribe 3 párrafos mínimos. Tu objetivo NO es crear una landing desde cero, sino OPTIMIZAR la que ya existe. Dime exactamente qué 'sección' o 'bloque' de la landing page actual debería ajustarse, qué promesas específicas agregar o qué palabras cambiar basándote en las objeciones encontradas.",
  "prompt_plan": "Escribe 3 párrafos mínimos. Tu objetivo NO es crear un bot desde cero, sino OPTIMIZAR el prompt que ya existe. Dime qué líneas o 'condiciones' exactas debemos agregarle al bot actual para que maneje estas objeciones específicas usando PNL.",
  "ads_plan": "Escribe 3 párrafos mínimos. Tu objetivo NO es crear campañas desde cero, sino OPTIMIZAR los anuncios que ya están rodando. Dime qué pequeño ajuste hacer en los videos actuales, qué frase agregar en los primeros 3 segundos (gancho), o qué viñetas añadir al texto (copy) para matar las dudas."
}

Reglas para 'words':
- Extrae las 10 a 15 verdaderas fricciones, miedos, motivadores o problemas (Ej. 'Próstata', 'Caro', 'Desconfianza', 'Duda Dosis').
- Agrupa sinónimos o errores ortográficos (Ej. 'prosta', 'protatis' -> 'Salud Prostática').
- Asigna un 'count' estimado de su nivel de importancia (del 1 al 20, siendo 20 el mayor dolor).
- NO uses palabras genéricas (info, precio, hola, quiero).
`;

    const aiOutput = await routeAIRequest({
      organizationId: targetOrgId,
      module: 'nlp',
      systemPrompt,
      requireJson: true,
      providerOverride: modelProvider // The UI dropdown overrides the global setting if provided
    });

    let resultJson;
    try {
      const cleanedJson = aiOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      resultJson = JSON.parse(cleanedJson);
    } catch (e) {
      console.error('Failed to parse JSON from AI:', aiOutput);
      return res.status(500).json({ error: 'La IA no devolvió un formato JSON válido.' });
    }

    return res.status(200).json({ result: resultJson });

  } catch (error: any) {
    console.error('Error analyzing NLP:', error);
    return res.status(500).json({ error: 'Error interno del servidor al contactar la IA: ' + error.message });
  }
}
