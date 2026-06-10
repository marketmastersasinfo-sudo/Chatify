import { Key, MapPin, Target, Plus, Save } from 'lucide-react';

export function Settings() {
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
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-soft hover:bg-blue-500">
            <Save className="h-4 w-4" />
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        
        {/* Motores de IA */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Key className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Motores de Inteligencia Artificial</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* OpenAI */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2">OpenAI (GPT-4o)</label>
              <input type="password" placeholder="sk-proj-..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue="sk-proj-123456789" />
              <div className="mt-2 flex items-center gap-2 text-xs text-green-600 font-medium">
                <div className="w-2 h-2 rounded-full bg-green-500"></div> Conectado
              </div>
            </div>
            {/* Claude */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Anthropic (Claude 3.5 Sonnet)</label>
              <input type="password" placeholder="sk-ant-..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
                <div className="w-2 h-2 rounded-full bg-gray-300"></div> No Configurado
              </div>
            </div>
            {/* Grok */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-semibold text-gray-900 mb-2">xAI (Grok-2)</label>
              <input type="password" placeholder="xai-..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" />
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 font-medium">
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
              <p className="text-sm text-gray-500">Para validación de direcciones y Street View.</p>
            </div>
          </div>
          <div className="max-w-xl">
            <label className="block text-sm font-semibold text-gray-900 mb-2">Google Maps API Key</label>
            <input type="password" placeholder="AIzaSy..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500" defaultValue="AIzaSyAABCDEF12345" />
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
