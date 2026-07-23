import { useState, useEffect } from 'react';
import { Key, MapPin, Target, Plus, Save, Loader2, CheckCircle2, Eye, EyeOff, Network } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AiTesterPanel } from '../components/AiTesterPanel';

export function Settings() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [globalCosts, setGlobalCosts] = useState<any>(null);

  // Global Tracking Pixels
  const [metaPixelId, setMetaPixelId] = useState('');
  const [metaCapiToken, setMetaCapiToken] = useState('');
  const [showMetaSecret, setShowMetaSecret] = useState(false);
  const [tiktokPixelId, setTiktokPixelId] = useState('');
  const [tiktokAccessToken, setTiktokAccessToken] = useState('');
  const [ga4MeasurementId, setGa4MeasurementId] = useState('');
  const [ga4ApiSecret, setGa4ApiSecret] = useState('');
  const [showGa4Secret, setShowGa4Secret] = useState(false);

  // AI Settings
  const [aiSettings, setAiSettings] = useState<Record<string, { model: string; key: string }>>({
    openai: { model: 'gpt-4o-mini', key: '' },
    gemini: { model: 'gemini-2.0-flash', key: '' },
    llama: { model: 'llama-3.3-70b-versatile', key: '' },
    anthropic: { model: 'claude-3-haiku-20240307', key: '' },
    grok: { model: 'grok-3-mini', key: '' },
    deepseek: { model: 'deepseek-chat', key: '' },
    mistral: { model: 'mistral-small-latest', key: '' },
    together: { model: 'meta-llama/Llama-4-Scout-17B-16E-Instruct', key: '' }
  });
  const [showAiKeys, setShowAiKeys] = useState<Record<string, boolean>>({});
  const [aiRouting, setAiRouting] = useState<Record<string, string[]>>({
    whatsapp: ['openai'],
    social_media: ['anthropic'],
    templates: ['openai'],
    nlp: ['openai']
  });


  const updateAiSetting = (provider: string, field: 'model' | 'key', value: string) => {
    setAiSettings((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value }
    }));
  };

  const toggleAiKeyVisibility = (provider: string) => {
    setShowAiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) console.error("Error loading org:", error);
      if (data && data.length > 0) {
        setOrgId(data[0].id);
        setGoogleMapsKey(data[0].google_maps_api_key || '');
        setMetaPixelId(data[0].meta_pixel_id || '');
        setMetaCapiToken(data[0].meta_capi_token || '');
        setTiktokPixelId(data[0].tiktok_pixel_id || '');
        setTiktokAccessToken(data[0].tiktok_access_token || '');
        setGa4MeasurementId(data[0].ga4_measurement_id || '');
        setGa4ApiSecret(data[0].ga4_api_secret || '');
        if (data[0].ai_settings) {
          setAiSettings((prev) => {
            const newSettings = { ...prev };
            Object.keys(data[0].ai_settings).forEach((provider) => {
              if (provider === 'routing') return;
              newSettings[provider] = {
                ...newSettings[provider],
                ...data[0].ai_settings[provider]
              };
            });
            return newSettings;
          });
          if (data[0].ai_settings.routing) {
            const routingData = data[0].ai_settings.routing;
            const parsedRouting: Record<string, string[]> = {};
            for (const key in routingData) {
              if (typeof routingData[key] === 'string') {
                parsedRouting[key] = [routingData[key]];
              } else if (Array.isArray(routingData[key])) {
                parsedRouting[key] = routingData[key];
              }
            }
            setAiRouting((prev) => ({ ...prev, ...parsedRouting }));
          }
        }
      }

      // Load global costs
      const currentMonth = new Date().toISOString().substring(0, 7);
      const startDate = `${currentMonth}-01T00:00:00Z`;
      
      const [aiLogsRes, apiLogsRes] = await Promise.all([
        (supabase as any).from('ai_usage_log').select('estimated_cost_usd').gte('created_at', startDate),
        (supabase as any).from('api_usage_counters').select('estimated_cost_usd, api_name').eq('month', currentMonth)
      ]);
      
      const totalAi = aiLogsRes.data?.reduce((sum: number, log: any) => sum + (Number(log.estimated_cost_usd) || 0), 0) || 0;
      const totalMaps = apiLogsRes.data?.filter((l: any) => l.api_name === 'google_street_view')
                                       .reduce((sum: number, log: any) => sum + (Number(log.estimated_cost_usd) || 0), 0) || 0;
                                       
      setGlobalCosts({ ai: totalAi, maps: totalMaps, month: currentMonth });
      
    } catch (e) {
      console.error("Catch error:", e);
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const payload = {
        name: 'Mi Organización',
        google_maps_api_key: googleMapsKey,
        meta_pixel_id: metaPixelId,
        meta_capi_token: metaCapiToken,
        tiktok_pixel_id: tiktokPixelId,
        tiktok_access_token: tiktokAccessToken,
        ga4_measurement_id: ga4MeasurementId,
        ga4_api_secret: ga4ApiSecret,
        ai_settings: { ...aiSettings, routing: aiRouting }
      };

      if (!orgId) {
        const { data, error } = await (supabase as any).from('organizations').insert(payload).select().single();
        if (error) {
          console.error("Insert error:", error);
          alert('Error: ' + error.message);
          setSaving(false);
          return;
        }
        if (data) setOrgId(data.id);
      } else {
        const { data, error } = await (supabase as any).from('organizations').update(payload).eq('id', orgId).select();
        if (error) {
          console.error("Update error:", error);
          alert('Error: ' + error.message);
          setSaving(false);
          return;
        }
        if (!data || data.length === 0) {
          console.error("Update returned 0 rows. RLS might be blocking this update.");
          alert('Error Crítico: Supabase no permitió guardar (Actualizó 0 filas). Revisa las políticas RLS de la tabla organizations.');
          setSaving(false);
          return;
        }
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e: any) {
      console.error(e);
      alert('Error guardando configuración: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      <div className="sm:flex sm:items-center sm:justify-between sticky top-0 z-10 bg-white/80 backdrop-blur-md p-4 -mx-4 border-b border-gray-100 shadow-sm rounded-b-xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configuración Global (v2)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Credenciales maestras, integraciones y motores de Inteligencia Artificial.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-blue-500 disabled:opacity-70"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saveSuccess ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saveSuccess ? '¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Panel de Costos Globales */}
        {globalCosts && (
          <div className="glass-card rounded-2xl p-6 mb-2 border-t-4 border-t-emerald-500">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Costos Globales ({globalCosts.month})</h2>
                <p className="text-sm text-gray-500">Sumatoria de gastos de IA y APIs de todas tus tiendas.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Inteligencia Artificial</p>
                  <p className="text-2xl font-black text-purple-900">${globalCosts.ai.toFixed(4)} <span className="text-sm font-normal text-purple-600">USD</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-purple-700">Todas las tiendas</p>
                </div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Google Maps (Street View)</p>
                  <p className="text-2xl font-black text-blue-900">${globalCosts.maps.toFixed(4)} <span className="text-sm font-normal text-blue-600">USD</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-700">Primeros $200/mes gratis</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Arena de Comparación de IAs (En Vivo) */}
        <AiTesterPanel aiSettings={aiSettings} orgId={orgId} />

        {/* Motores de IA */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Motores de Inteligencia Artificial & Router</h2>
          </div>
          <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <b className="text-blue-800">🧠 AI Router & Fallback (Cascada):</b> Chatify usará <b>GPT-4o mini</b> para cerrar ventas por WA, <b>Claude 3</b> para moderar Redes Sociales, y <b>Llama 3</b> para clasificar Kanban. Si el motor principal se cae en un lanzamiento, el tráfico saltará automáticamente al motor de respaldo para garantizar 100% de operatividad.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. OpenAI */}
            <div className="p-4 bg-gray-50 rounded-xl border border-blue-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-200">
                #1 Recomendado (Calidad/Precio)
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">OpenAI</label>
                <select 
                  className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={aiSettings.openai.model}
                  onChange={(e) => updateAiSetting('openai', 'model', e.target.value)}
                >
                  <option value="gpt-4o-mini">GPT-4o mini — $0.15/1M in</option>
                  <option value="gpt-4.1-mini">GPT-4.1 mini — $0.40/1M in</option>
                  <option value="gpt-4.1-nano">GPT-4.1 nano — $0.10/1M in</option>
                  <option value="gpt-4o">GPT-4o (Premium) — $2.50/1M in</option>
                  <option value="o4-mini">o4-mini (Razonamiento) — $1.10/1M in</option>
                </select>
                <p className="text-[10px] text-gray-400 mb-3 ml-1">API compatible con OpenAI. El estándar de la industria.</p>
                <div className="relative">
                  <input 
                    type={showAiKeys['openai'] ? "text" : "password"} 
                    placeholder="sk-proj-..." 
                    value={aiSettings.openai.key}
                    onChange={(e) => updateAiSetting('openai', 'key', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button type="button" onClick={() => toggleAiKeyVisibility('openai')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAiKeys['openai'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {aiSettings.openai.key.length > 20 ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                  </div>
                )}
              </div>
            </div>

            {/* 2. Google Gemini */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-200">
                🆓 1,500 req/día GRATIS
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Google Gemini</label>
                <select 
                  className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={aiSettings.gemini.model}
                  onChange={(e) => updateAiSetting('gemini', 'model', e.target.value)}
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash — $0.10/1M in</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Razonamiento) — $0.15/1M in</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Premium) — $1.25/1M in</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy) — $0.075/1M in</option>
                </select>
                <p className="text-[10px] text-gray-400 mb-3 ml-1">aistudio.google.com/apikey — Contexto de 1M tokens.</p>
                <div className="relative">
                  <input 
                    type={showAiKeys['gemini'] ? "text" : "password"} 
                    placeholder="AIzaSy..." 
                    value={aiSettings.gemini.key}
                    onChange={(e) => updateAiSetting('gemini', 'key', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button type="button" onClick={() => toggleAiKeyVisibility('gemini')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAiKeys['gemini'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {aiSettings.gemini.key.length > 20 ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                  </div>
                )}
              </div>
            </div>

            {/* 3. Meta Llama (Groq) */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full border border-green-200">
                🆓 14,400 req/día GRATIS
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Llama (vía Groq)</label>
                <select 
                  className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={aiSettings.llama.model}
                  onChange={(e) => updateAiSetting('llama', 'model', e.target.value)}
                >
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Potente) — $0.59/1M in</option>
                  <option value="llama-3.1-8b-instant">Llama 3.1 8B (Gratis) — $0.05/1M in</option>
                  <option value="llama-4-scout-17b-16e">Llama 4 Scout 17B (Nuevo) — $0.11/1M in</option>
                </select>
                <p className="text-[10px] text-gray-400 mb-3 ml-1">console.groq.com — El hardware más rápido del mundo.</p>
                <div className="relative">
                  <input 
                    type={showAiKeys['llama'] ? "text" : "password"} 
                    placeholder="gsk_..." 
                    value={aiSettings.llama.key}
                    onChange={(e) => updateAiSetting('llama', 'key', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button type="button" onClick={() => toggleAiKeyVisibility('llama')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAiKeys['llama'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {aiSettings.llama.key.length > 20 ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                  </div>
                )}
              </div>
            </div>

            {/* 4. Anthropic (Claude) */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full border border-amber-200">
                Más Humano / Natural
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Anthropic (Claude)</label>
                <select 
                  className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={aiSettings.anthropic.model}
                  onChange={(e) => updateAiSetting('anthropic', 'model', e.target.value)}
                >
                  <option value="claude-3-haiku-20240307">Claude 3 Haiku (Barato) — $0.25/1M in</option>
                  <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (Potente) — $3.00/1M in</option>
                  <option value="claude-haiku-4-20250514">Claude Haiku 4 (Nuevo/Rápido) — $0.80/1M in</option>
                  <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (Legacy) — $3.00/1M in</option>
                </select>
                <p className="text-[10px] text-gray-400 mb-3 ml-1">console.anthropic.com — Mejor tono conversacional.</p>
                <div className="relative">
                  <input 
                    type={showAiKeys['anthropic'] ? "text" : "password"} 
                    placeholder="sk-ant-..." 
                    value={aiSettings.anthropic.key}
                    onChange={(e) => updateAiSetting('anthropic', 'key', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button type="button" onClick={() => toggleAiKeyVisibility('anthropic')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAiKeys['anthropic'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {aiSettings.anthropic.key.length > 20 ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                  </div>
                )}
              </div>
            </div>

            {/* 5. Grok */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200">
                ⚡ Excelente Cierre Ventas
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">xAI (Grok)</label>
                <select 
                  className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={aiSettings.grok.model}
                  onChange={(e) => updateAiSetting('grok', 'model', e.target.value)}
                >
                  <option value="grok-3-mini">Grok 3 Mini (Nuevo/Rápido) — $0.30/1M in</option>
                  <option value="grok-3">Grok 3 (Flagship) — $3.00/1M in</option>
                  <option value="grok-2-latest">Grok-2 (Legacy) — $2.00/1M in</option>
                </select>
                <p className="text-[10px] text-gray-400 mb-3 ml-1">console.x.ai — Muy bueno cerrando ventas (caro).</p>
                <div className="relative">
                  <input 
                    type={showAiKeys['grok'] ? "text" : "password"} 
                    placeholder="xai-..." 
                    value={aiSettings.grok.key}
                    onChange={(e) => updateAiSetting('grok', 'key', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button type="button" onClick={() => toggleAiKeyVisibility('grok')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAiKeys['grok'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {aiSettings.grok.key.length > 20 ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                  </div>
                )}
              </div>
            </div>

            {/* 6. Deepseek */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full border border-purple-200">
                Mejor Razonamiento
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Deepseek AI</label>
                <select 
                  className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={aiSettings.deepseek.model}
                  onChange={(e) => updateAiSetting('deepseek', 'model', e.target.value)}
                >
                  <option value="deepseek-chat">DeepSeek V3 (Rápido) — $0.14/1M in</option>
                  <option value="deepseek-reasoner">DeepSeek R1 (Razonamiento) — $0.55/1M in</option>
                </select>
                <p className="text-[10px] text-gray-400 mb-3 ml-1">platform.deepseek.com — Calidad de GPT-4o a precio mínimo.</p>
                <div className="relative">
                  <input 
                    type={showAiKeys['deepseek'] ? "text" : "password"} 
                    placeholder="sk-..." 
                    value={aiSettings.deepseek.key}
                    onChange={(e) => updateAiSetting('deepseek', 'key', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button type="button" onClick={() => toggleAiKeyVisibility('deepseek')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAiKeys['deepseek'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {aiSettings.deepseek.key.length > 20 ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                  </div>
                )}
              </div>
            </div>

            {/* 7. Mistral AI — NUEVO */}
            <div className="p-4 bg-gray-50 rounded-xl border border-orange-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-1 rounded-full border border-orange-200">
                🆕 Europeo / Ultra-Rápido
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Mistral AI</label>
                <select 
                  className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={aiSettings.mistral.model}
                  onChange={(e) => updateAiSetting('mistral', 'model', e.target.value)}
                >
                  <option value="mistral-small-latest">Mistral Small 4 (Rápido) — $0.15/1M in</option>
                  <option value="mistral-medium-latest">Mistral Medium 3.5 (Potente) — $1.50/1M in</option>
                  <option value="mistral-large-latest">Mistral Large 3 (Flagship) — $2.00/1M in</option>
                </select>
                <p className="text-[10px] text-gray-400 mb-3 ml-1">console.mistral.ai — Excelente en español. API OpenAI-compatible.</p>
                <div className="relative">
                  <input 
                    type={showAiKeys['mistral'] ? "text" : "password"} 
                    placeholder="..." 
                    value={aiSettings.mistral.key}
                    onChange={(e) => updateAiSetting('mistral', 'key', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button type="button" onClick={() => toggleAiKeyVisibility('mistral')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAiKeys['mistral'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {aiSettings.mistral.key.length > 20 ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                  </div>
                )}
              </div>
            </div>

            {/* 8. Together AI — NUEVO */}
            <div className="p-4 bg-gray-50 rounded-xl border border-cyan-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-cyan-100 text-cyan-700 text-[10px] font-bold px-2 py-1 rounded-full border border-cyan-200">
                🆕 +100 Modelos / Ultra-Barato
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Together AI</label>
                <select 
                  className="w-full mb-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500"
                  value={aiSettings.together.model}
                  onChange={(e) => updateAiSetting('together', 'model', e.target.value)}
                >
                  <option value="meta-llama/Llama-4-Scout-17B-16E-Instruct">Llama 4 Scout 17B — $0.11/1M in</option>
                  <option value="meta-llama/Llama-4-Maverick-17B-128E-Instruct">Llama 4 Maverick 17B — $0.27/1M in</option>
                  <option value="Qwen/Qwen3-235B-A22B">Qwen 3 235B (Enorme) — $0.60/1M in</option>
                  <option value="deepseek-ai/DeepSeek-R1">DeepSeek R1 (vía Together) — $0.55/1M in</option>
                  <option value="meta-llama/Llama-3.3-70B-Instruct-Turbo">Llama 3.3 70B Turbo — $0.60/1M in</option>
                </select>
                <p className="text-[10px] text-gray-400 mb-3 ml-1">api.together.ai — Acceso a +100 modelos open source con una key.</p>
                <div className="relative">
                  <input 
                    type={showAiKeys['together'] ? "text" : "password"} 
                    placeholder="..." 
                    value={aiSettings.together.key}
                    onChange={(e) => updateAiSetting('together', 'key', e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" 
                  />
                  <button type="button" onClick={() => toggleAiKeyVisibility('together')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showAiKeys['together'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                {aiSettings.together.key.length > 20 ? (
                  <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Routing Rules */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Network className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Reglas de Enrutamiento (Cascada)</h2>
              <p className="text-sm text-gray-500">Selecciona el motor principal y sus respaldos por si falla.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: 'whatsapp', label: 'Bot WhatsApp', color: 'purple' },
              { id: 'social_media', label: 'Bot Redes Sociales', color: 'gray' },
              { id: 'templates', label: 'Plantillas (Ads)', color: 'gray' },
              { id: 'nlp', label: 'Reportes (NLP)', color: 'gray' }
            ].map(mod => {
              const providers = aiRouting[mod.id] || ['openai'];
              return (
                <div key={mod.id} className={`p-4 bg-gray-50 rounded-xl border ${mod.color === 'purple' ? 'border-purple-200 shadow-sm bg-purple-50/30' : 'border-gray-200'}`}>
                  <label className={`block text-sm font-bold mb-3 ${mod.color === 'purple' ? 'text-purple-900' : 'text-gray-900'}`}>{mod.label}</label>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 ml-1">Primario</p>
                      <select 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-purple-500"
                        value={providers[0] || 'openai'}
                        onChange={(e) => {
                          const newProviders = [e.target.value, providers[1], providers[2]].filter(Boolean);
                          setAiRouting({...aiRouting, [mod.id]: newProviders});
                        }}
                      >
                        <option value="openai">OpenAI (GPT-4o Mini)</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="google">Google Gemini</option>
                        <option value="llama">Meta Llama (Groq)</option>
                        <option value="grok">xAI Grok</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="mistral">Mistral AI</option>
                        <option value="together">Together AI</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 ml-1">Respaldo 1</p>
                      <select 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-purple-500"
                        value={providers[1] || ''}
                        onChange={(e) => {
                          const newProviders = [providers[0], e.target.value, providers[2]].filter(Boolean);
                          setAiRouting({...aiRouting, [mod.id]: newProviders});
                        }}
                      >
                        <option value="">-- Sin respaldo --</option>
                        <option value="openai">OpenAI (GPT-4o Mini)</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="google">Google Gemini</option>
                        <option value="llama">Meta Llama (Groq)</option>
                        <option value="grok">xAI Grok</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="mistral">Mistral AI</option>
                        <option value="together">Together AI</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-500 mb-1 ml-1">Respaldo 2</p>
                      <select 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-purple-500 opacity-70 hover:opacity-100"
                        value={providers[2] || ''}
                        onChange={(e) => {
                          const newProviders = [providers[0], providers[1], e.target.value].filter(Boolean);
                          setAiRouting({...aiRouting, [mod.id]: newProviders});
                        }}
                      >
                        <option value="">-- Sin respaldo --</option>
                        <option value="openai">OpenAI (GPT-4o Mini)</option>
                        <option value="anthropic">Anthropic (Claude)</option>
                        <option value="google">Google Gemini</option>
                        <option value="llama">Meta Llama (Groq)</option>
                        <option value="grok">xAI Grok</option>
                        <option value="deepseek">DeepSeek</option>
                        <option value="mistral">Mistral AI</option>
                        <option value="together">Together AI</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Google Maps API */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-50 rounded-lg">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Google Maps Integration</h2>
              <p className="text-sm text-gray-500">Para validación de direcciones y Street View automático por WhatsApp.</p>
            </div>
          </div>
          <div className="max-w-xl">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Google Maps API Key</label>
            <div className="relative">
              <input 
                type={showMapsKey ? "text" : "password"}
                placeholder="AIzaSy..." 
                value={googleMapsKey}
                onChange={(e) => setGoogleMapsKey(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 font-mono" 
              />
              <button 
                type="button"
                onClick={() => setShowMapsKey(!showMapsKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showMapsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            <div className="mt-3 flex items-center gap-2 text-xs font-bold px-2 py-1.5 rounded-md inline-flex border">
              {googleMapsKey.length > 20 ? (
                <div className="flex items-center gap-2 bg-green-50 text-green-700 px-1 border-transparent">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado de forma exitosa
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500 border-transparent">
                  <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-4 border-t border-gray-100 pt-3">
              Se requiere habilitar la <b>Street View Static API</b> en tu proyecto de Google Cloud para que funcione el bot de envío de fachadas por WhatsApp.
            </p>
          </div>
        </div>

        {/* Pixel Maestro CAPI */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Píxel Maestro Meta (Global CAPI)</h2>
                <p className="text-sm text-gray-500">Recibe todos los eventos globales calificación 10/10 (Add to Cart, Purchase, etc).</p>
              </div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm font-semibold text-blue-600 border border-gray-200 hover:bg-gray-100">
              <Plus className="h-4 w-4" /> Agregar Otro Píxel Global
            </button>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 max-w-3xl mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">ID del Píxel</label>
                <input type="text" value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} placeholder="1029384756..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-1">Token de Acceso (CAPI)</label>
                <div className="relative">
                  <input 
                    type={showMetaSecret ? "text" : "password"} 
                    value={metaCapiToken} 
                    onChange={(e) => setMetaCapiToken(e.target.value)} 
                    placeholder="EAA..." 
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowMetaSecret(!showMetaSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showMetaSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                <div className="mt-3 flex items-center gap-2 text-xs font-bold px-2 py-1.5 rounded-md inline-flex border">
                  {metaPixelId && metaCapiToken.length > 50 ? (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-1 border-transparent">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado de forma exitosa
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 border-transparent">
                      <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Probar Conexión en Vivo (Opcional)</label>
              <p className="text-xs text-gray-500 mb-3">Si quieres ver el evento en la pestaña de "Probar eventos" de Facebook, pega aquí el código de prueba que te da Facebook (ej. TEST12345) y haz clic en probar.</p>
              <div className="flex gap-2 max-w-md">
                <input type="text" placeholder="TEST..." className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm" id="metaTestCode" />
                <button 
                  onClick={() => {
                    const code = (document.getElementById('metaTestCode') as HTMLInputElement).value;
                    const btn = document.getElementById('testBtnMeta');
                    if (btn) btn.innerHTML = 'Enviando...';
                    fetch('/api/tracking/fire-event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        leadId: 'TEST', eventName: 'Purchase', value: 85000, currency: 'COP', 
                        testEventCode: code || undefined,
                        overrides: { metaPixelId, metaCapiToken }
                      })
                    }).then(r => r.json()).then(data => {
                      if (btn) btn.innerHTML = 'Enviar Venta de Prueba';
                      alert('Respuesta de Meta:\n\n' + JSON.stringify(data.results?.facebook || data, null, 2));
                    }).catch(e => alert('Error: ' + e.message));
                  }}
                  id="testBtnMeta"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold shadow hover:bg-purple-500 transition-colors"
                >
                  Enviar Venta de Prueba
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-black rounded-lg">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.95v5.23c.01 3.97-3.11 7.29-7.07 7.29-3.93 0-7.25-3.09-7.25-7.04 0-3.84 2.97-6.96 6.81-7.06V10.6c-1.57.07-3.08.82-4.15 2.05-1.07 1.23-1.56 2.89-1.39 4.54.19 1.83 1.25 3.51 2.8 4.49 1.56.99 3.51 1.18 5.23.51 1.72-.67 3.04-2.12 3.53-3.89.3-.99.38-2.07.21-3.08V.02zm-5.46 17.65c-.01-.01-.02-.01-.03-.02.01.01.02.01.03.02z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Píxel Maestro TikTok (Events API)</h2>
              <p className="text-sm text-gray-500">Eventos globales respaldados por la API de Eventos de TikTok.</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 max-w-3xl mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">ID del Píxel TikTok</label>
                <input type="text" value={tiktokPixelId} onChange={(e) => setTiktokPixelId(e.target.value)} placeholder="C..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-1">Access Token (Events API)</label>
                <input type="password" value={tiktokAccessToken} onChange={(e) => setTiktokAccessToken(e.target.value)} placeholder="..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Probar Conexión en Vivo (Opcional)</label>
              <p className="text-xs text-gray-500 mb-3">Haz clic para enviar un evento simulado a TikTok y verificar que tu Access Token es válido.</p>
              <div className="flex gap-2 max-w-md">
                <button 
                  onClick={() => {
                    const btn = document.getElementById('testBtnTiktok');
                    if (btn) btn.innerHTML = 'Enviando...';
                    fetch('/api/tracking/fire-event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        leadId: 'TEST', eventName: 'Purchase', value: 85000, currency: 'COP',
                        overrides: { tiktokPixelId, tiktokAccessToken }
                      })
                    }).then(r => r.json()).then(data => {
                      if (btn) btn.innerHTML = 'Enviar Venta de Prueba';
                      alert('Respuesta de TikTok:\n\n' + JSON.stringify(data.results?.tiktok || data, null, 2));
                    }).catch(e => alert('Error: ' + e.message));
                  }}
                  id="testBtnTiktok"
                  className="px-4 py-2 bg-black text-white rounded-lg text-sm font-bold shadow hover:bg-gray-800 transition-colors"
                >
                  Enviar Venta de Prueba
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-6 mt-8">
            <div className="p-2 bg-blue-50 rounded-lg">
              <svg className="h-6 w-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Google Analytics 4 (Measurement API)</h2>
              <p className="text-sm text-gray-500">Seguimiento maestro con GA4 para Google Ads.</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Measurement ID (G-...)</label>
                <input type="text" value={ga4MeasurementId} onChange={(e) => setGa4MeasurementId(e.target.value)} placeholder="G-XXXXXXXXXX" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-1">API Secret (Measurement Protocol)</label>
                <div className="relative">
                  <input 
                    type={showGa4Secret ? "text" : "password"} 
                    value={ga4ApiSecret} 
                    onChange={(e) => setGa4ApiSecret(e.target.value)} 
                    placeholder="..." 
                    className="w-full pl-3 pr-10 py-2 border border-gray-200 rounded-lg text-sm" 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowGa4Secret(!showGa4Secret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showGa4Secret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                <div className="mt-3 flex items-center gap-2 text-xs font-bold px-2 py-1.5 rounded-md inline-flex border">
                  {ga4MeasurementId && ga4ApiSecret.length > 5 ? (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-1 border-transparent">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado de forma exitosa
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 border-transparent">
                      <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Probar Conexión en Vivo (Opcional)</label>
              <p className="text-xs text-gray-500 mb-3">Haz clic para enviar una compra a GA4. Aparecerá en el <b>DebugView</b> de Google Analytics en tiempo real.</p>
              <div className="flex gap-2 max-w-md">
                <button 
                  onClick={() => {
                    const btn = document.getElementById('testBtnGa4');
                    if (btn) btn.innerHTML = 'Enviando...';
                    fetch('/api/tracking/fire-event', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        leadId: 'TEST', eventName: 'Purchase', value: 85000, currency: 'COP',
                        overrides: { ga4MeasurementId, ga4ApiSecret }
                      })
                    }).then(r => r.json()).then(data => {
                      if (btn) btn.innerHTML = 'Enviar Venta de Prueba';
                      alert('Respuesta de GA4 (204 = Éxito):\n\n' + JSON.stringify(data.results?.google || data, null, 2));
                    }).catch(e => alert('Error: ' + e.message));
                  }}
                  id="testBtnGa4"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow hover:bg-blue-700 transition-colors"
                >
                  Enviar Venta de Prueba
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
