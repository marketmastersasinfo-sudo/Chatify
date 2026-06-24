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
  "landing_plan": "Crea una estructura SUPER DETALLADA de Landing Page. Escribe 3 párrafos mínimos. Incluye: 1. Qué título principal (Headline) usar para captar atención en 3 segundos. 2. Cómo atacar su dolor específico. 3. Qué prueba social mostrar. 4. Qué garantía ofrecer.",
  "prompt_plan": "Crea un guión EXACTO de ventas (para copiar y pegar) usando PNL profunda. Escribe 3 párrafos mínimos. Incluye: 1. Saludo empático. 2. Reconocimiento del dolor. 3. Presentación del producto como la ÚNICA solución. 4. Un Call to Action de urgencia.",
  "ads_plan": "Crea 3 ángulos de anuncios ESPECÍFICOS para Facebook/TikTok. Escribe 3 párrafos mínimos. Para cada ángulo detalla: 1. El gancho visual (Hook). 2. El texto persuasivo (Copy). 3. El llamado a la acción."
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
