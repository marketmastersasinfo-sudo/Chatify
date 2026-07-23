import { useState } from 'react';
import { Play, Sparkles, Clock, DollarSign, AlertCircle, Loader2, Bot } from 'lucide-react';

interface TestResult {
  provider: string;
  name: string;
  response: string;
  latencyMs: number;
  costUsd: number;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

export function AiTesterPanel({ aiSettings, orgId }: { aiSettings: Record<string, { model: string; key: string }>; orgId: string | null }) {
  const [prompt, setPrompt] = useState(
    'Hola, vi la pauta de las 3 camisas por $120.000 COP. ¿Tienen talla M en color negro y azul? ¿El envío a Medellín es gratis y contraentrega?'
  );
  const [systemPrompt, setSystemPrompt] = useState(
    'Eres Sophia, una asesora comercial experta de Chatify. Tu objetivo es cerrar la venta de manera amable, persuadir sutilmente, responder las dudas sobre disponibilidad (sí hay talla M en negro y azul), confirmar que el envío a Medellín es GRATIS y Pago Contraentrega. Invita a dar sus datos de envío.'
  );
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const providers = [
    { id: 'openai', name: 'OpenAI', badge: '#1 Recomendado', logoBg: 'bg-emerald-500/10 text-emerald-600' },
    { id: 'gemini', name: 'Google Gemini', badge: '🆓 1,500 req/día', logoBg: 'bg-blue-500/10 text-blue-600' },
    { id: 'llama', name: 'Meta Llama (Groq)', badge: '⚡ Ultra-Rápido', logoBg: 'bg-amber-500/10 text-amber-600' },
    { id: 'grok', name: 'xAI (Grok)', badge: '🔥 Cierre Agresivo', logoBg: 'bg-red-500/10 text-red-600' },
    { id: 'deepseek', name: 'DeepSeek AI', badge: '🧠 Razonamiento', logoBg: 'bg-indigo-500/10 text-indigo-600' },
    { id: 'mistral', name: 'Mistral AI', badge: '🛍️ Persuasivo', logoBg: 'bg-purple-500/10 text-purple-600' }
  ];

  const handleRunTest = async () => {
    setIsRunning(true);
    const initialResults: Record<string, TestResult> = {};

    providers.forEach(p => {
      const cfg = aiSettings[p.id];
      if (cfg && cfg.key && cfg.key.length > 10) {
        initialResults[p.id] = {
          provider: p.id,
          name: p.name,
          response: '',
          latencyMs: 0,
          costUsd: 0,
          status: 'pending'
        };
      }
    });

    setResults(initialResults);
    const activeProviderIds = Object.keys(initialResults);

    await Promise.all(
      activeProviderIds.map(async (providerId) => {
        const startTime = Date.now();
        const cfg = aiSettings[providerId];
        try {
          const res = await fetch('/api/test-single-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orgId,
              provider: providerId,
              model: cfg.model,
              apiKey: cfg.key,
              systemPrompt,
              userPrompt: prompt
            })
          });

          const data = await res.json();
          const latencyMs = Date.now() - startTime;

          if (!res.ok || data.error) {
            setResults(prev => ({
              ...prev,
              [providerId]: {
                ...prev[providerId],
                status: 'error',
                latencyMs,
                error: data.error || 'Error en la petición'
              }
            }));
          } else {
            setResults(prev => ({
              ...prev,
              [providerId]: {
                ...prev[providerId],
                status: 'success',
                response: data.response,
                latencyMs,
                costUsd: data.estimatedCostUsd || 0
              }
            }));
          }
        } catch (e: any) {
          setResults(prev => ({
            ...prev,
            [providerId]: {
              ...prev[providerId],
              status: 'error',
              latencyMs: Date.now() - startTime,
              error: e.message
            }
          }));
        }
      })
    );

    setIsRunning(false);
  };

  const configuredCount = providers.filter(p => aiSettings[p.id]?.key?.length > 10).length;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gray-200/80 bg-white/70 backdrop-blur-xl shadow-xl p-8 transition-all">
      {/* Subtle Apple-style background glow */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-gray-900 to-gray-700 text-white flex items-center justify-center shadow-lg shadow-gray-900/10">
              <Sparkles className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">
                  Arena de Inteligencia Artificial
                </h2>
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  {configuredCount} de 6 activas
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-medium">
                Benchmark simultáneo de latencia, costo y calidad de redacción comercial.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunTest}
            disabled={isRunning || configuredCount === 0}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-semibold text-sm shadow-xl shadow-gray-900/10 disabled:opacity-40 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                <span>Simulando 6 Motores...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-purple-400" />
                <span>Ejecutar Prueba Multimotor</span>
              </>
            )}
          </button>
        </div>

        {/* Input Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/60 transition-all focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/10">
            <label className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
              <span className="uppercase tracking-wider">Instrucción Comercial (System Prompt)</span>
              <span className="text-[10px] text-gray-400">Rol del Bot</span>
            </label>
            <textarea
              rows={2}
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              className="w-full bg-white p-3 text-xs text-gray-800 border border-gray-200/80 rounded-xl focus:outline-none focus:border-purple-500 leading-relaxed font-medium"
            />
          </div>

          <div className="bg-gray-50/70 p-4 rounded-2xl border border-gray-200/60 transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/10">
            <label className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
              <span className="uppercase tracking-wider">Mensaje de Prueba del Cliente (User Prompt)</span>
              <span className="text-[10px] text-gray-400">Pregunta simulada</span>
            </label>
            <textarea
              rows={2}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              className="w-full bg-white p-3 text-xs text-gray-800 border border-gray-200/80 rounded-xl focus:outline-none focus:border-blue-500 leading-relaxed font-medium"
            />
          </div>
        </div>

        {/* Response Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {providers.map(p => {
            const cfg = aiSettings[p.id];
            const isConfigured = cfg && cfg.key && cfg.key.length > 10;
            const res = results[p.id];

            return (
              <div
                key={p.id}
                className={`group relative rounded-2xl p-5 border transition-all duration-300 flex flex-col justify-between ${
                  !isConfigured
                    ? 'bg-gray-50/50 border-gray-200/60 opacity-50'
                    : res?.status === 'success'
                    ? 'bg-white border-emerald-500/30 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/20'
                    : res?.status === 'error'
                    ? 'bg-rose-50/40 border-rose-200/80'
                    : res?.status === 'pending'
                    ? 'bg-white border-purple-400/50 shadow-md ring-2 ring-purple-500/10 animate-pulse'
                    : 'bg-white/80 border-gray-200/70 shadow-sm hover:shadow-md hover:border-gray-300'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl text-xs font-bold ${p.logoBg}`}>
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm tracking-tight">{p.name}</h3>
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{cfg?.model || 'Desconectado'}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200/60">
                      {p.badge}
                    </span>
                  </div>

                  {/* Body Content */}
                  {!isConfigured ? (
                    <div className="py-8 text-center">
                      <p className="text-xs text-gray-400 font-medium">Clave no ingresada</p>
                    </div>
                  ) : res?.status === 'pending' ? (
                    <div className="py-10 flex flex-col items-center justify-center text-purple-600 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                      <span className="text-xs font-medium text-gray-500">Generando respuesta...</span>
                    </div>
                  ) : res?.status === 'error' ? (
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-rose-600 text-xs flex items-start gap-2 leading-relaxed">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <span>{res.error}</span>
                    </div>
                  ) : res?.status === 'success' ? (
                    <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed font-medium max-h-48 overflow-y-auto">
                      "{res.response}"
                    </div>
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-xs text-gray-400 font-medium">Listo para ejecutar</p>
                    </div>
                  )}
                </div>

                {/* Footer Metrics */}
                {res?.status === 'success' && (
                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-600">
                      <Clock className="w-3.5 h-3.5 text-blue-500" /> {res.latencyMs} ms
                    </span>
                    <span className={`flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                      res.costUsd === 0 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' 
                        : 'bg-gray-100 text-gray-700 border border-gray-200/60'
                    }`}>
                      <DollarSign className="w-3 h-3" />
                      {res.costUsd === 0 ? 'GRATIS' : `$${res.costUsd.toFixed(6)}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
