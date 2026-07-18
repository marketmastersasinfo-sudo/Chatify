/**
 * ai-router.ts — AI Router v2 con Cascada Real + Log de Uso
 * 
 * Cada módulo puede tener múltiples proveedores en orden de prioridad.
 * Si el primero falla, intenta con el segundo, etc.
 * Logs de uso se guardan para tracking de costos por tienda.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Token cost per 1M tokens (input) — approximate USD
const COST_PER_1M: Record<string, number> = {
  'gpt-4o-mini': 0.15,
  'gpt-4o': 2.50,
  'gpt-4.1-mini': 0.40,
  'gpt-4.1-nano': 0.10,
  'claude-3-haiku-20240307': 0.25,
  'claude-3-5-sonnet-20241022': 3.00,
  'gemini-1.5-flash': 0.075,
  'gemini-2.0-flash': 0.10,
  'llama-3.1-8b-instant': 0.05,
  'llama-3.3-70b-versatile': 0.59,
  'grok-2-latest': 2.00,
  'deepseek-reasoner': 0.55,
  'deepseek-chat': 0.14,
  'whisper-1': 0.006 // per second, not per token
};

export interface AIRequest {
  organizationId: string;
  module: 'whatsapp' | 'social_media' | 'templates' | 'nlp' | 'audio_transcription';
  systemPrompt: string;
  messages?: { role: string; content: string }[];
  requireJson?: boolean;
  providerOverride?: string;
  // For cost tracking
  storeId?: string;
  leadId?: string;
}

export async function routeAIRequest(req: AIRequest): Promise<string> {
  // 1. Fetch AI Settings
  const { data: orgData } = await supabase
    .from('organizations')
    .select('ai_settings')
    .eq('id', req.organizationId)
    .single();

  const aiSettings = orgData?.ai_settings || {};
  const routing = aiSettings.routing || {};

  // Get provider chain for this module
  // Supports both old format ("openai") and new format (["deepseek", "openai", "google"])
  let providerChain: string[];
  
  if (req.providerOverride) {
    providerChain = [req.providerOverride];
  } else {
    const moduleRouting = routing[req.module];
    if (Array.isArray(moduleRouting)) {
      providerChain = moduleRouting;
    } else if (typeof moduleRouting === 'string') {
      providerChain = [moduleRouting];
    } else {
      providerChain = ['openai']; // Default fallback
    }
  }

  // Build the messages payload
  let finalMessages: any[] = [{ role: 'system', content: req.systemPrompt }];
  if (req.requireJson) {
    finalMessages[0].content += '\n\nIMPORTANT: You must respond ONLY with a valid JSON object. Do not include markdown code blocks like ```json.';
  }
  if (req.messages && req.messages.length > 0) {
    finalMessages = finalMessages.concat(req.messages);
  }

  // 2. Try each provider in the chain (cascade)
  const errors: string[] = [];
  
  for (const provider of providerChain) {
    const providerConfig = aiSettings[provider] || {};
    
    // Fallback keys if not set in DB
    const envKeys: Record<string, string | undefined> = {
      openai: process.env.OPENAI_API_KEY,
      anthropic: process.env.ANTHROPIC_API_KEY,
      google: process.env.GEMINI_API_KEY,
      llama: process.env.GROQ_API_KEY,
      grok: process.env.GROK_API_KEY,
      deepseek: process.env.DEEPSEEK_API_KEY
    };
    
    const apiKey = providerConfig.key || envKeys[provider];
    if (!apiKey) {
      errors.push(`${provider}: No API key configured`);
      continue; // Skip to next provider in chain
    }

    try {
      const startTime = Date.now();
      const result = await callProvider(provider, providerConfig, apiKey, finalMessages, req.requireJson);
      const elapsed = Date.now() - startTime;

      // Log usage (fire-and-forget, don't block response)
      logUsage({
        organizationId: req.organizationId,
        storeId: req.storeId,
        leadId: req.leadId,
        module: req.module,
        provider,
        model: providerConfig.model || getDefaultModel(provider),
        inputTokens: estimateTokens(finalMessages),
        outputTokens: estimateTokens([{ content: result }]),
        latencyMs: elapsed,
        success: true
      }).catch(() => {}); // Silent fail for logging

      return result;

    } catch (err: any) {
      const errorMsg = `${provider}: ${err.message}`;
      errors.push(errorMsg);
      console.error(`[AI Router] ${errorMsg} — trying next provider...`);
      
      // Log failed attempt
      logUsage({
        organizationId: req.organizationId,
        storeId: req.storeId,
        module: req.module,
        provider,
        model: providerConfig.model || getDefaultModel(provider),
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - Date.now(),
        success: false,
        error: err.message
      }).catch(() => {});

      continue; // Try next provider
    }
  }

  // All providers failed
  throw new Error(`All AI providers failed:\n${errors.join('\n')}`);
}

// ═══════════════════════════════════════
// Provider dispatch
// ═══════════════════════════════════════
async function callProvider(provider: string, config: any, apiKey: string, messages: any[], requireJson?: boolean): Promise<string> {
  const model = config.model || getDefaultModel(provider);
  
  if (provider === 'openai') {
    const body: any = { model, messages, temperature: 0.65, max_tokens: 2000 };
    if (requireJson && (model.startsWith('gpt-4') || model.startsWith('gpt-3.5'))) {
      body.response_format = { type: 'json_object' };
    }
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  }

  if (provider === 'anthropic') {
    const system = messages[0].content;
    const userMessages = messages.slice(1);
    if (userMessages.length === 0) userMessages.push({ role: 'user', content: 'Begin your response now.' });
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, system, messages: userMessages, max_tokens: 2000, temperature: 0.65 })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.content[0].text;
  }

  if (provider === 'google') {
    const contents = messages.map((m: any) => ({
      role: m.role === 'system' ? 'user' : (m.role === 'assistant' ? 'model' : 'user'),
      parts: [{ text: m.content }]
    }));
    const body: any = { contents };
    if (requireJson) body.generationConfig = { responseMimeType: "application/json" };
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.candidates[0].content.parts[0].text;
  }

  if (provider === 'llama') {
    const body: any = { model, messages, temperature: 0.65, max_tokens: 2000 };
    if (requireJson) body.response_format = { type: 'json_object' };
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  }

  if (provider === 'grok') {
    const body: any = { model, messages, temperature: 0.65, max_tokens: 2000 };
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.choices[0].message.content;
  }

  if (provider === 'deepseek') {
    const body: any = { model, messages, temperature: 0.65, max_tokens: 2000 };
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    let output = data.choices[0].message.content;
    // Deepseek reasoner outputs <think> tags
    if (requireJson && output.includes('</think>')) {
      output = output.split('</think>')[1].trim();
    }
    return output;
  }

  throw new Error(`Unsupported AI provider: ${provider}`);
}

// ═══════════════════════════════════════
// Whisper Audio Transcription
// ═══════════════════════════════════════
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string, orgId: string, storeId?: string): Promise<string> {
  // Get API key — Whisper always uses OpenAI
  const { data: orgData } = await supabase
    .from('organizations')
    .select('ai_settings')
    .eq('id', orgId)
    .single();

  const aiSettings = orgData?.ai_settings || {};
  const apiKey = aiSettings.openai?.key || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('No OpenAI API key for Whisper transcription');

  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'ogg';
  
  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  formData.append('file', blob, `audio.${ext}`);
  formData.append('model', 'whisper-1');
  formData.append('language', 'es');

  const startTime = Date.now();
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: formData
  });

  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  // Log usage
  logUsage({
    organizationId: orgId,
    storeId,
    module: 'audio_transcription',
    provider: 'openai',
    model: 'whisper-1',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: Date.now() - startTime,
    success: true
  }).catch(() => {});

  return data.text || '';
}

// ═══════════════════════════════════════
// Usage Logging (for cost tracking)
// ═══════════════════════════════════════
interface UsageLog {
  organizationId: string;
  storeId?: string;
  leadId?: string;
  module: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  error?: string;
}

async function logUsage(log: UsageLog) {
  const model = log.model;
  const costPer1M = COST_PER_1M[model] || 0.15; // Default to gpt-4o-mini price
  const totalTokens = log.inputTokens + log.outputTokens;
  const estimatedCost = (totalTokens / 1_000_000) * costPer1M;

  try {
    await supabase.from('ai_usage_log').insert({
      organization_id: log.organizationId,
      store_id: log.storeId || null,
      lead_id: log.leadId || null,
      module: log.module,
      provider: log.provider,
      model: log.model,
      input_tokens: log.inputTokens,
      output_tokens: log.outputTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCost,
      latency_ms: log.latencyMs,
      success: log.success,
      error_message: log.error || null
    });
  } catch (e) {
    // Table might not exist yet — silent fail
    console.error('[AI Usage Log] Insert failed:', e);
  }
}

function estimateTokens(messages: any[]): number {
  // Rough estimate: ~4 chars per token
  let chars = 0;
  for (const msg of messages) {
    const content = typeof msg === 'string' ? msg : (msg.content || msg.text || '');
    chars += content.length;
  }
  return Math.ceil(chars / 4);
}

function getDefaultModel(provider: string): string {
  const defaults: Record<string, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
    google: 'gemini-1.5-flash',
    llama: 'llama-3.1-8b-instant',
    grok: 'grok-2-latest',
    deepseek: 'deepseek-reasoner'
  };
  return defaults[provider] || 'gpt-4o-mini';
}
