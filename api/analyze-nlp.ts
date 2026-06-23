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
    const { productName, words, modelProvider, organizationId } = req.body;

    if (!productName || !words || words.length === 0) {
      return res.status(400).json({ error: 'Missing product or words data.' });
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

    const wordsList = words.map((w: any) => `${w.word} (${w.count} veces)`).join(', ');
    
    const systemPrompt = `Eres un experto en e-commerce y optimización de conversión (CRO). 
El dueño de la tienda está analizando por qué los clientes abandonan la compra del producto "${productName}".
Al analizar el historial de chats de cientos de clientes que NO compraron, la IA extrajo las siguientes palabras clave más repetidas:

${wordsList}

Tu tarea es darme un diagnóstico súper conciso y 3 recomendaciones MUY CORTAS (bullet points) para mejorar las ventas de este producto basadas estrictamente en esas palabras. 
No uses palabras introductorias largas, ve directo al grano. Formatea tu respuesta en markdown con emojis.`;

    const aiOutput = await routeAIRequest({
      organizationId: targetOrgId,
      module: 'nlp',
      systemPrompt,
      providerOverride: modelProvider // The UI dropdown overrides the global setting if provided
    });

    return res.status(200).json({ result: aiOutput });

  } catch (error: any) {
    console.error('Error analyzing NLP:', error);
    return res.status(500).json({ error: 'Error interno del servidor al contactar la IA: ' + error.message });
  }
}
