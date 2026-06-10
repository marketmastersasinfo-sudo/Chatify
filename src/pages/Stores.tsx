import { useState } from 'react';
import { Store, Smartphone, Target, Settings2, Plus, ShoppingBag } from 'lucide-react';

export function Stores() {
  const [selectedCountry, setSelectedCountry] = useState('Colombia');
  const [selectedStore, setSelectedStore] = useState('Dropi Principal');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Organización Multitienda</h1>
          <p className="mt-2 text-sm text-gray-500">
            Gestiona la jerarquía de Países, Tiendas, SIM Cards, Píxeles y Catálogos de manera aislada.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500">
          <Plus className="h-4 w-4" /> Nueva Tienda
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🌎 Paises Activos</h3>
            <div className="space-y-1">
              {['Colombia', 'México', 'Argentina', 'Chile'].map(country => (
                <button 
                  key={country}
                  onClick={() => setSelectedCountry(country)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedCountry === country ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  {country}
                </button>
              ))}
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex justify-between items-center">
              Tiendas en {selectedCountry}
              <Plus className="w-3 h-3 cursor-pointer text-blue-600" />
            </h3>
            <div className="space-y-1">
              <button onClick={() => setSelectedStore('Dropi Principal')} className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedStore === 'Dropi Principal' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Store className="w-4 h-4" /> Dropi Principal
              </button>
              <button onClick={() => setSelectedStore('Nicho Belleza')} className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedStore === 'Nicho Belleza' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Store className="w-4 h-4" /> Nicho Belleza
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="glass-card rounded-2xl p-6 border-t-4 border-t-blue-600">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Store className="text-blue-600" /> Configuración: {selectedStore} ({selectedCountry})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp Config */}
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Smartphone className="w-4 h-4 text-green-600" /> Conexión WhatsApp</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">SIM Card Asignada</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" defaultValue="Tigo Plan Empresas #4" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Número WABA</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" defaultValue="+57 300 123 4567" />
                  </div>
                </div>
              </div>

              {/* Pixel Config */}
              <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Target className="w-4 h-4 text-purple-600" /> Píxel de Tienda</h3>
                  <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-3 h-3" /> Añadir Píxel</button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">ID Píxel</label>
                    <input type="text" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" defaultValue="84759384758" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Token CAPI</label>
                    <input type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" defaultValue="EAA123" />
                  </div>
                </div>
              </div>
            </div>

            {/* Products & AI Rules */}
            <div className="mt-6 p-5 bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl border border-blue-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-blue-600" /> Catálogo y Reglas IA de la Tienda</h3>
                <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"><Plus className="w-4 h-4" /> Nuevo Producto</button>
              </div>
              
              <div className="space-y-4">
                {/* Product Item */}
                <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">Joggers UrbanFit</h4>
                    <p className="text-xs text-gray-500 mt-1">Precio: $89.000 COP | Envío: Gratis</p>
                  </div>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    <Settings2 className="w-4 h-4" /> Prompt y Reglas
                  </button>
                </div>
                {/* Product Item */}
                <div className="border border-gray-200 rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900">Camiseta Supreme Blanca</h4>
                    <p className="text-xs text-gray-500 mt-1">Precio: $45.000 COP | Envío: $10.000 COP</p>
                  </div>
                  <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm font-semibold text-gray-700 hover:bg-gray-100">
                    <Settings2 className="w-4 h-4" /> Prompt y Reglas
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
