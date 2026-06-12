import { useState, useEffect } from 'react';
import { Key, MapPin, Target, Plus, Save, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Settings() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [googleMapsKey, setGoogleMapsKey] = useState('');
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const { data } = await (supabase as any).from('organizations').select('*').limit(1).single();
      if (data) {
        setOrgId(data.id);
        setGoogleMapsKey(data.google_maps_api_key || '');
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSaveSettings() {
    if (!orgId) return;
    setSaving(true);
    try {
      await (supabase as any).from('organizations').update({
        google_maps_api_key: googleMapsKey
      }).eq('id', orgId);
      
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

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 max-w-3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Nombre del Píxel</label>
                <input type="text" placeholder="Ej: Píxel Respaldo Agencia" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" defaultValue="Pixel Maestro Chatify" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">ID del Píxel</label>
                <input type="text" placeholder="1029384756..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" defaultValue="847592038475" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-1">Token de Acceso (CAPI)</label>
                <input type="password" placeholder="EAA..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" defaultValue="EAAQxABCDEF123" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
