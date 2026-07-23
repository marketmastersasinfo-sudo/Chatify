import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

const COST_PER_1M_TOKENS: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.15, out: 0.60 },
  'gpt-4o': { in: 2.50, out: 10.00 },
  'gemini-2.0-flash': { in: 0.00, out: 0.00 }, // Free tier
  'gemini-1.5-flash': { in: 0.00, out: 0.00 }, // Free tier
  'gemini-1.5-pro': { in: 1.25, out: 5.00 },
  'llama-3.1-8b-instant': { in: 0.00, out: 0.00 }, // Free tier Groq
  'llama-3.3-70b-versatile': { in: 0.59, out: 0.79 },
  'grok-3-mini': { in: 0.30, out: 1.20 },
  'grok-2-latest': { in: 2.00, out: 10.00 },
  'deepseek-chat': { in: 0.14, out: 0.28 },
  'deepseek-reasoner': { in: 0.55, out: 2.19 },
  'mistral-small-latest': { in: 0.15, out: 0.60 },
  'mistral-medium-latest': { in: 1.50, out: 7.50 }
};

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
    let usageTokens = { prompt_tokens: 0, completion_tokens: 0 };
    const selectedModel = model || getDefaultModel(provider);

    const messages = [
      { role: 'system', content: systemPrompt || 'Eres un asesor comercial experto.' },
      { role: 'user', content: userPrompt || 'Hola' }
    ];

    if (provider === 'openai') {
      const resAI = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.choices[0]?.message?.content || '';
      if (data.usage) usageTokens = data.usage;
    } else if (provider === 'gemini') {
      const geminiBody: any = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt || 'Eres un asesor comercial.'}\n\nCliente: ${userPrompt || 'Hola'}` }]
          }
        ]
      };

      // Intentar v1beta primero, si falla por cuota/facturación intentar v1
      let resAI = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody)
      });
      let data = await resAI.json();

      if (data.error) {
        // Fallback a v1 con gemini-1.5-flash
        resAI = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody)
        });
        data = await resAI.json();
      }

      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.candidates[0]?.content?.parts[0]?.text || '';
      if (data.usageMetadata) {
        usageTokens = {
          prompt_tokens: data.usageMetadata.promptTokenCount || 0,
          completion_tokens: data.usageMetadata.candidatesTokenCount || 0
        };
      }
    } else if (provider === 'llama') {
      const resAI = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.choices[0]?.message?.content || '';
      if (data.usage) usageTokens = data.usage;
    } else if (provider === 'grok') {
      const resAI = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.choices[0]?.message?.content || '';
      if (data.usage) usageTokens = data.usage;
    } else if (provider === 'deepseek') {
      const resAI = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: selectedModel,
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
      if (data.usage) usageTokens = data.usage;
    } else if (provider === 'mistral') {
      const resAI = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: selectedModel,
          messages,
          temperature: 0.7,
          max_tokens: 350
        })
      });
      const data = await resAI.json();
      if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
      resultText = data.choices[0]?.message?.content || '';
      if (data.usage) usageTokens = data.usage;
    } else {
      throw new Error(`Proveedor no soportado: ${provider}`);
    }

    const latencyMs = Date.now() - startTime;

    // Accurate cost calculation
    const rates = COST_PER_1M_TOKENS[selectedModel] || { in: 0.15, out: 0.60 };
    const inputCost = ((usageTokens.prompt_tokens || 100) / 1_000_000) * rates.in;
    const outputCost = ((usageTokens.completion_tokens || 150) / 1_000_000) * rates.out;
    const estimatedCostUsd = inputCost + outputCost;

    // Guardar en ai_usage_log para que impacte el contador global de consumo
    try {
      await supabase.from('ai_usage_log').insert({
        organization_id: req.body.orgId || null,
        module: 'arena_test',
        provider,
        model: selectedModel,
        input_tokens: usageTokens.prompt_tokens || 100,
        output_tokens: usageTokens.completion_tokens || 150,
        total_tokens: (usageTokens.prompt_tokens || 100) + (usageTokens.completion_tokens || 150),
        estimated_cost_usd: estimatedCostUsd,
        latency_ms: latencyMs,
        success: true
      });
    } catch (e) {
      console.error('Error insertando en ai_usage_log:', e);
    }

    return res.status(200).json({
      success: true,
      response: resultText,
      latencyMs,
      estimatedCostUsd
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Error invocando proveedor de IA'
    });
  }
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.0-flash',
    llama: 'llama-3.1-8b-instant',
    grok: 'grok-3-mini',
    deepseek: 'deepseek-chat',
    mistral: 'mistral-small-latest'
  };
  return defaults[provider] || 'gpt-4o-mini';
}
