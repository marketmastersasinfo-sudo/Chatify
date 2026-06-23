import { createClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';

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

    // 1. Fetch AI Settings from Supabase
    const { data: orgData } = await supabase
      .from('organizations')
      .select('ai_settings')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    const aiSettings = orgData?.ai_settings || {};

    let aiOutput = '';

    if (modelProvider === 'openai') {
      const p = aiSettings.openai || {};
      const apiKey = p.key || process.env.OPENAI_API_KEY;
      const model = p.model || 'gpt-4o-mini';
      if (!apiKey) return res.status(400).json({ error: 'No hay API Key configurada para OpenAI en el panel global.' });
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: systemPrompt }], temperature: 0.7, max_tokens: 800 })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.choices[0].message.content;

    } else if (modelProvider === 'anthropic') {
      const p = aiSettings.anthropic || {};
      const apiKey = p.key || process.env.ANTHROPIC_API_KEY;
      const model = p.model || 'claude-3-haiku-20240307';
      if (!apiKey) return res.status(400).json({ error: 'No hay API Key configurada para Anthropic en el panel global.' });

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens: 800, messages: [{ role: 'user', content: systemPrompt }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.content[0].text;

    } else if (modelProvider === 'google') {
      const p = aiSettings.gemini || {};
      const apiKey = p.key || process.env.GEMINI_API_KEY;
      const model = p.model || 'gemini-1.5-flash';
      if (!apiKey) return res.status(400).json({ error: 'No hay API Key configurada para Google Gemini en el panel global.' });

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.candidates[0].content.parts[0].text;

    } else if (modelProvider === 'llama') {
      const p = aiSettings.llama || {};
      const apiKey = p.key;
      const model = p.model || 'llama-3.1-8b-instant';
      if (!apiKey) return res.status(400).json({ error: 'No hay API Key configurada para Meta Llama (Groq) en el panel global.' });

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: systemPrompt }], temperature: 0.7, max_tokens: 800 })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.choices[0].message.content;

    } else if (modelProvider === 'grok') {
      const p = aiSettings.grok || {};
      const apiKey = p.key;
      const model = p.model || 'grok-2-latest';
      if (!apiKey) return res.status(400).json({ error: 'No hay API Key configurada para xAI (Grok) en el panel global.' });

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: systemPrompt }], temperature: 0.7, max_tokens: 800 })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.choices[0].message.content;

    } else if (modelProvider === 'deepseek') {
      const p = aiSettings.deepseek || {};
      const apiKey = p.key;
      const model = p.model || 'deepseek-reasoner';
      if (!apiKey) return res.status(400).json({ error: 'No hay API Key configurada para Deepseek en el panel global.' });

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: systemPrompt }], temperature: 0.7, max_tokens: 800 })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      aiOutput = data.choices[0].message.content;

    } else {
      return res.status(400).json({ error: 'Proveedor de IA no válido.' });
    }

    return res.status(200).json({ result: aiOutput });

  } catch (error: any) {
    console.error('Error analyzing NLP:', error);
    return res.status(500).json({ error: 'Error interno del servidor al contactar la IA: ' + error.message });
  }
}
