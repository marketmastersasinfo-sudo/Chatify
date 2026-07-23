export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { provider, model, apiKey, systemPrompt, userPrompt } = req.body;

  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Falta proveedor o API key' });
  }

  const startTime = Date.now();

  try {
    let resultText = '';
    const messages = [
      { role: 'system', content: systemPrompt || 'Eres un asesor comercial experto.' },
      { role: 'user', content: userPrompt || 'Hola' }
    ];

    if (provider === 'openai') {
      const resAI = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.choices[0]?.message?.content || '';
    } else if (provider === 'gemini') {
      const contents = messages.map(m => ({
        role: m.role === 'system' ? 'user' : m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
      const modelName = model || 'gemini-1.5-flash';
      const resAI = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.candidates[0]?.content?.parts[0]?.text || '';
    } else if (provider === 'llama') {
      const resAI = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'llama-3.1-8b-instant',
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.choices[0]?.message?.content || '';
    } else if (provider === 'grok') {
      const resAI = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'grok-2-latest',
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.choices[0]?.message?.content || '';
    } else if (provider === 'deepseek') {
      const resAI = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'deepseek-chat',
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      let out = data.choices[0]?.message?.content || '';
      if (out.includes('</think>')) {
        out = out.split('</think>')[1].trim();
      }
      resultText = out;
    } else if (provider === 'mistral') {
      const resAI = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || 'mistral-small-latest',
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.choices[0]?.message?.content || '';
    } else {
      throw new Error(`Proveedor no soportado: ${provider}`);
    }

    const latencyMs = Date.now() - startTime;

    return res.status(200).json({
      success: true,
      response: resultText,
      latencyMs,
      estimatedCostUsd: 0.0001
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Error invocando proveedor de IA'
    });
  }
}
