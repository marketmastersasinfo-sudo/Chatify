import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AIRequest {
  organizationId: string;
  module: 'whatsapp' | 'social_media' | 'templates' | 'nlp';
  systemPrompt: string;
  messages?: { role: string; content: string }[]; // User messages
  requireJson?: boolean;
  providerOverride?: string;
}

export async function routeAIRequest(req: AIRequest): Promise<string> {
  try {
    // 1. Fetch AI Settings
    const { data: orgData } = await supabase
      .from('organizations')
      .select('ai_settings')
      .eq('id', req.organizationId)
      .single();

    const aiSettings = orgData?.ai_settings || {};
    const routing = aiSettings.routing || {};
    
    // Fallback to openai if module not configured
    const provider = req.providerOverride || routing[req.module] || 'openai';
    const providerConfig = aiSettings[provider] || {};
    
    // Fallback keys if not set in DB
    const keys: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      google: process.env.GEMINI_API_KEY,
      llama: '',
      grok: '',
      deepseek: ''
    };
    
    const apiKey = providerConfig.key || keys[provider];
    if (!apiKey) throw new Error(`No API Key found for provider: ${provider}`);

    // Build the messages payload
    let finalMessages: any[] = [{ role: 'system', content: req.systemPrompt }];
    if (req.requireJson) {
      finalMessages[0].content += '\n\nIMPORTANT: You must respond ONLY with a valid JSON object. Do not include markdown code blocks like ```json.';
    }
    
    if (req.messages && req.messages.length > 0) {
      finalMessages = finalMessages.concat(req.messages);
    }

    let responseOutput = '';

    // 2. Dispatch to specific provider
    if (provider === 'openai') {
      const model = providerConfig.model || 'gpt-4o-mini';
      const body: any = {
        model,
        messages: finalMessages,
        temperature: 0.65,
        max_tokens: 2000
      };
      
      if (req.requireJson && (model.startsWith('gpt-4') || model.startsWith('gpt-3.5'))) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      responseOutput = data.choices[0].message.content;

    } else if (provider === 'anthropic') {
      const model = providerConfig.model || 'claude-3-haiku-20240307';
      const system = finalMessages[0].content;
      const userMessages = finalMessages.slice(1);
      
      // If requireJson, we can pre-fill the assistant response with { to force JSON, 
      // but let's stick to standard chat completion for simplicity.
      if (userMessages.length === 0) userMessages.push({ role: 'user', content: 'Begin your response now.' });

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model,
          system,
          messages: userMessages,
          max_tokens: 2000,
          temperature: 0.65
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      responseOutput = data.content[0].text;

    } else if (provider === 'google') {
      const model = providerConfig.model || 'gemini-1.5-flash';
      // Gemini expects everything in 'contents'
      const contents = finalMessages.map((m: any) => ({
        role: m.role === 'system' ? 'user' : (m.role === 'assistant' ? 'model' : 'user'),
        parts: [{ text: m.content }]
      }));

      const body: any = { contents };
      if (req.requireJson) body.generationConfig = { responseMimeType: "application/json" };

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      responseOutput = data.candidates[0].content.parts[0].text;

    } else if (provider === 'llama') {
      const model = providerConfig.model || 'llama-3.1-8b-instant';
      const body: any = {
        model,
        messages: finalMessages,
        temperature: 0.65,
        max_tokens: 2000
      };
      if (req.requireJson) body.response_format = { type: 'json_object' };

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      responseOutput = data.choices[0].message.content;

    } else if (provider === 'grok') {
      const model = providerConfig.model || 'grok-2-latest';
      const body: any = {
        model,
        messages: finalMessages,
        temperature: 0.65,
        max_tokens: 2000
      };
      // Grok usually supports response_format but sometimes fails, safe to request json in prompt
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      responseOutput = data.choices[0].message.content;

    } else if (provider === 'deepseek') {
      const model = providerConfig.model || 'deepseek-reasoner';
      const body: any = {
        model,
        messages: finalMessages,
        temperature: 0.65,
        max_tokens: 2000
      };
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      responseOutput = data.choices[0].message.content;
      
      // Deepseek reasoner usually outputs thinking in `<think>` tags, we should strip them for JSON
      if (req.requireJson && responseOutput.includes('</think>')) {
        responseOutput = responseOutput.split('</think>')[1].trim();
      }

    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }

    return responseOutput;

  } catch (error: any) {
    console.error(`AI Router Error:`, error);
    throw new Error(error.message || 'AI Routing failed');
  }
}
