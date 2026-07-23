import { useState } from 'react';
import { Play, Sparkles, Clock, DollarSign, AlertCircle, Loader2 } from 'lucide-react';

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
    { id: 'openai', name: 'OpenAI', badge: '#1 Recomendado' },
    { id: 'gemini', name: 'Google Gemini', badge: '🆓 1,500 req/día' },
    { id: 'llama', name: 'Meta Llama (Groq)', badge: '🆓 14,400 req/día' },
    { id: 'grok', name: 'xAI (Grok)', badge: '⚡ Excelente Cierre' },
    { id: 'deepseek', name: 'DeepSeek AI', badge: '🧠 Mejor Razonamiento' },
    { id: 'mistral', name: 'Mistral AI', badge: '🆕 Europeo / Ultra-Rápido' }
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
    <div className="glass-card rounded-2xl p-6 border-2 border-purple-200 bg-gradient-to-br from-purple-50/40 via-white to-blue-50/40 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              Arena de Comparación de IAs (En Vivo)
              <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-semibold">
                {configuredCount} / 6 Listas para la batalla
              </span>
            </h2>
            <p className="text-sm text-gray-500">
              Prueba el mismo mensaje de un cliente contra todas tus IAs conectadas al mismo tiempo.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunTest}
          disabled={isRunning || configuredCount === 0}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-all cursor-pointer"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Procesando 6 IAs...
            </>
          ) : (
            <>
              <Play className="w-5 h-5 fill-current" />
              ¡Lanzar Batalla de IAs!
            </>
          )}
        </button>
      </div>

      {/* Configuration Prompts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-bold text-purple-900 uppercase tracking-wide mb-1">
            Instrucción / Prompt del Bot (System)
          </label>
          <textarea
            rows={2}
            value={systemPrompt}
            onChange={e => setSystemPrompt(e.target.value)}
            className="w-full p-2.5 text-xs border border-purple-200 rounded-xl bg-white focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-blue-900 uppercase tracking-wide mb-1">
            Mensaje de Prueba del Cliente (User Prompt)
          </label>
          <textarea
            rows={2}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="w-full p-2.5 text-xs border border-blue-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Grid of Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(p => {
          const cfg = aiSettings[p.id];
          const isConfigured = cfg && cfg.key && cfg.key.length > 10;
          const res = results[p.id];

          return (
            <div
              key={p.id}
              className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                !isConfigured
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : res?.status === 'success'
                  ? 'bg-white border-green-300 shadow-md ring-2 ring-green-100'
                  : res?.status === 'error'
                  ? 'bg-red-50/50 border-red-200'
                  : res?.status === 'pending'
                  ? 'bg-purple-50/50 border-purple-300 animate-pulse'
                  : 'bg-white border-gray-200 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-900 text-sm">{p.name}</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                    {cfg?.model || 'Desconectado'}
                  </span>
                </div>

                {!isConfigured ? (
                  <p className="text-xs text-gray-400 italic py-6 text-center">Falta API Key</p>
                ) : res?.status === 'pending' ? (
                  <div className="py-8 flex flex-col items-center justify-center text-purple-600 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="text-xs font-semibold">Pensando respuesta...</span>
                  </div>
                ) : res?.status === 'error' ? (
                  <div className="p-3 bg-red-100/60 rounded-lg text-red-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{res.error}</span>
                  </div>
                ) : res?.status === 'success' ? (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-800 leading-relaxed font-medium max-h-48 overflow-y-auto">
                    "{res.response}"
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-6 text-center">Presiona "Lanzar Batalla" para probar.</p>
                )}
              </div>

              {/* Footer Stats */}
              {res?.status === 'success' && (
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1 text-blue-600">
                    <Clock className="w-3.5 h-3.5" /> {res.latencyMs} ms
                  </span>
                  <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                    <DollarSign className="w-3 h-3" /> ${(res.costUsd || 0).toFixed(6)} USD
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
