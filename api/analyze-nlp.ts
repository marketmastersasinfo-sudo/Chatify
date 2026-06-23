import type { VercelRequest, VercelResponse } from '@vercel/node';

export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { productName, words, modelProvider } = req.body;

    if (!productName || !words || words.length === 0) {
      return res.status(400).json({ error: 'Missing product or words data.' });
    }

    const wordsList = words.map((w: any) => `${w.word} (${w.count} veces)`).join(', ');
    
    const systemPrompt = `Eres un experto en e-commerce y optimización de conversión (CRO). 
El dueño de la tienda está analizando por qué los clientes abandonan la compra del producto "${productName}".
Al analizar el historial de chats de cientos de clientes que NO compraron, la IA extrajo las siguientes palabras clave más repetidas:

${wordsList}

Tu tarea es darme un diagnóstico súper conciso y 3 recomendaciones MUY CORTAS (bullet points) para mejorar las ventas de este producto basadas estrictamente en esas palabras. 
No uses palabras introductorias largas, ve directo al grano. Formatea tu respuesta en markdown con emojis.`;

    let aiOutput = '';

    if (modelProvider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Aún no has configurado la llave OPENAI_API_KEY en Vercel. Configúrala primero para usar GPT.' });
      }
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.7,
          max_tokens: 800
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.choices[0].message.content;

    } else if (modelProvider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Aún no has configurado la llave ANTHROPIC_API_KEY en Vercel. Configúrala primero para usar Claude.' });
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 800,
          messages: [{ role: 'user', content: systemPrompt }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.content[0].text;

    } else if (modelProvider === 'google') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Aún no has configurado la llave GEMINI_API_KEY en Vercel. Configúrala primero para usar Gemini.' });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.candidates[0].content.parts[0].text;

    } else {
      return res.status(400).json({ error: 'Proveedor de IA no válido.' });
    }

    return res.status(200).json({ result: aiOutput });

  } catch (error: any) {
    console.error('Error analyzing NLP:', error);
    return res.status(500).json({ error: 'Error interno del servidor al contactar la IA: ' + error.message });
  }
}
