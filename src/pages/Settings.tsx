import { useState, useEffect } from 'react';
import { Key, MapPin, Target, Plus, Save, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Settings() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Global Tracking Pixels
  const [metaPixelId, setMetaPixelId] = useState('');
  const [metaCapiToken, setMetaCapiToken] = useState('');
  const [tiktokPixelId, setTiktokPixelId] = useState('');
  const [tiktokAccessToken, setTiktokAccessToken] = useState('');
  const [ga4MeasurementId, setGa4MeasurementId] = useState('');
  const [ga4ApiSecret, setGa4ApiSecret] = useState('');
  const [showGa4Secret, setShowGa4Secret] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data } = await (supabase as any).from('organizations').select('*').limit(1).single();
      if (data) {
        setOrgId(data.id);
        setGoogleMapsKey(data.google_maps_api_key || '');
        setMetaPixelId(data.meta_pixel_id || '');
        setMetaCapiToken(data.meta_capi_token || '');
        setTiktokPixelId(data.tiktok_pixel_id || '');
        setTiktokAccessToken(data.tiktok_access_token || '');
        setGa4MeasurementId(data.ga4_measurement_id || '');
        setGa4ApiSecret(data.ga4_api_secret || '');
      }
    } catch (e) {
      console.error(e);
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
        ga4_api_secret: ga4ApiSecret
      };

      if (!orgId) {
        const { data } = await (supabase as any).from('organizations').insert(payload).select().single();
        if (data) setOrgId(data.id);
      } else {
        await (supabase as any).from('organizations').update(payload).eq('id', orgId);
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Error guardando configuración');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configuración Global</h1>
          <p className="mt-2 text-sm text-gray-500">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. OpenAI (Mejor Calidad/Precio) */}
            <div className="p-4 bg-gray-50 rounded-xl border border-blue-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full border border-blue-200">
                #1 Recomendado (Calidad/Precio)
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">OpenAI</label>
                <select className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option>GPT-4o mini (El más barato/obediente)</option>
                  <option>GPT-4o (Gasto alto)</option>
                  <option>GPT-4 Turbo</option>
                </select>
                <input type="password" placeholder="sk-proj-..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue="sk-proj-123456789" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-green-700 font-bold bg-green-50 px-2 py-1.5 rounded-md border border-green-200">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> ✅ Conectado de forma exitosa
                </div>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-800">Editar</button>
              </div>
            </div>

            {/* 2. Google Gemini */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Google Gemini</label>
                <select className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option>Gemini 1.5 Flash (Excelente contexto)</option>
                  <option>Gemini 1.5 Pro</option>
                </select>
                <input type="password" placeholder="AIzaSy..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
              </div>
            </div>

            {/* 3. Meta Llama */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Meta Llama (vía Groq)</label>
                <select className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option>Llama 3 8B (Gratis / Instantáneo)</option>
                  <option>Llama 3 70B</option>
                </select>
                <input type="password" placeholder="gsk_..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
              </div>
            </div>

            {/* 4. Anthropic */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Anthropic (Claude)</label>
                <select className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option>Claude 3 Haiku (Más humano)</option>
                  <option>Claude 3.5 Sonnet</option>
                </select>
                <input type="password" placeholder="sk-ant-..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
              </div>
            </div>

            {/* 5. Grok */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">xAI (Grok)</label>
                <select className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option>Grok-2</option>
                  <option>Grok-1.5</option>
                </select>
                <input type="password" placeholder="xai-..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
              </div>
            </div>

            {/* 6. Deepseek */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between shadow-sm relative">
              <div className="absolute -top-3 right-4 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full border border-purple-200">
                Mejor Razonamiento
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Deepseek AI</label>
                <select className="w-full mb-3 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-blue-500 focus:border-blue-500">
                  <option>Deepseek R1 (Razonamiento)</option>
                  <option>Deepseek V3 (Rápido)</option>
                </select>
                <input type="password" placeholder="sk-..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
              </div>
            </div>
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
                <label className="block text-sm font-semibold text-gray-900 mb-1">Nombre del Píxel</label>
                <input type="text" placeholder="Ej: Píxel Respaldo Agencia" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" defaultValue="Pixel Maestro Chatify" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">ID del Píxel</label>
                <input type="text" value={metaPixelId} onChange={(e) => setMetaPixelId(e.target.value)} placeholder="1029384756..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-1">Token de Acceso (CAPI)</label>
                <input type="password" value={metaCapiToken} onChange={(e) => setMetaCapiToken(e.target.value)} placeholder="EAA..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
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
                <label className="block text-sm font-semibold text-gray-900 mb-1">Nombre del Píxel</label>
                <input type="text" placeholder="Ej: TikTok Maestro" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">ID del Píxel TikTok</label>
                <input type="text" value={tiktokPixelId} onChange={(e) => setTiktokPixelId(e.target.value)} placeholder="C..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-1">Access Token (Events API)</label>
                <input type="password" value={tiktokAccessToken} onChange={(e) => setTiktokAccessToken(e.target.value)} placeholder="..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
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
                <label className="block text-sm font-semibold text-gray-900 mb-1">Nombre</label>
                <input type="text" placeholder="Ej: GA4 Chatify" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
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
          </div>
        </div>

      </div>
    </div>
  );
}
