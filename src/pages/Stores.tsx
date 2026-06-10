import { useState, useEffect } from 'react';
import { Store, Smartphone, Target, Plus, ShoppingBag, Loader2, Save, X, BrainCircuit, TrendingDown, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Stores() {
  const [selectedCountry, setSelectedCountry] = useState('Colombia');
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal/Form State
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newWaba, setNewWaba] = useState('');
  const [newPixel, setNewPixel] = useState('');

  useEffect(() => {
    loadStores();
  }, [selectedCountry]);

  async function loadStores() {
    setLoading(true);
    try {
      // 1. Obtener Organización principal (Crea una si no existe)
      let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      let orgId;
      if (!orgs || orgs.length === 0) {
        const { data: newOrg } = await supabase.from('organizations').insert({ name: 'Organización Principal' } as any).select().single();
        orgId = (newOrg as any)?.id;
      } else {
        orgId = (orgs as any)[0].id;
      }

      // 2. Traer las tiendas de ese país
      if (orgId) {
        const { data: storesData } = await supabase
          .from('stores')
          .select('*')
          .eq('country', selectedCountry)
          .eq('organization_id', orgId);
          
        setStores(storesData || []);
        if (storesData && storesData.length > 0) {
          setSelectedStore(storesData[0]);
        } else {
          setSelectedStore(null);
        }
      }
    } catch (error) {
      console.error("Error loading stores:", error);
    }
    setLoading(false);
  }

  async function handleSaveStore() {
    if (!newStoreName) return;
    setSaving(true);
    try {
      let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      
      const { data, error } = await supabase.from('stores').insert({
        organization_id: (orgs as any)![0].id,
        name: newStoreName,
        country: selectedCountry,
        waba_number: newWaba,
        meta_pixel_id: newPixel
      } as any).select().single();

      if (data && !error) {
        setStores([...stores, data]);
        setSelectedStore(data);
        setIsAdding(false);
        setNewStoreName('');
        setNewWaba('');
        setNewPixel('');
      }
    } catch (error) {
      console.error("Error saving store:", error);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Organización Multitienda</h1>
          <p className="mt-2 text-sm text-gray-500">
            Base de Datos Conectada: Guarda tus tiendas en la nube de Supabase.
          </p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500"
        >
          <Plus className="h-4 w-4" /> Nueva Tienda en {selectedCountry}
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
              Tiendas
              <Plus onClick={() => setIsAdding(true)} className="w-3 h-3 cursor-pointer text-blue-600" />
            </h3>
            <div className="space-y-1">
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 text-blue-500 animate-spin" /></div>
              ) : stores.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No hay tiendas aquí</p>
              ) : (
                stores.map(store => (
                  <button 
                    key={store.id}
                    onClick={() => setSelectedStore(store)} 
                    className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${selectedStore?.id === store.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Store className="w-4 h-4" /> {store.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {isAdding ? (
            <div className="glass-card rounded-2xl p-6 border-t-4 border-t-green-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Store className="text-green-600" /> Crear Nueva Tienda ({selectedCountry})
                </h2>
                <button onClick={() => setIsAdding(false)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Tienda</label>
                  <input value={newStoreName} onChange={e => setNewStoreName(e.target.value)} type="text" placeholder="Ej: Dropi Belleza" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Número WABA (Opcional)</label>
                  <input value={newWaba} onChange={e => setNewWaba(e.target.value)} type="text" placeholder="+57 300..." className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">ID del Píxel (Opcional)</label>
                  <input value={newPixel} onChange={e => setNewPixel(e.target.value)} type="text" placeholder="123456789" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500" />
                </div>
                <button onClick={handleSaveStore} disabled={saving} className="mt-4 w-full flex justify-center items-center gap-2 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar en Base de Datos
                </button>
              </div>
            </div>
          ) : selectedStore ? (
            <div className="glass-card rounded-2xl p-6 border-t-4 border-t-blue-600">
              <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Store className="text-blue-600" /> Configuración: {selectedStore.name}
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* WhatsApp Config (BSP) */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Smartphone className="w-4 h-4 text-green-600" /> WhatsApp & BSP</h3>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800">Editar</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Número WABA</label>
                      <input type="text" readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600" value={selectedStore.waba_number || 'No configurado'} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Proveedor (BSP)</label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-700 focus:ring-1 focus:ring-blue-500">
                        <option>360Dialog</option>
                        <option>Twilio</option>
                        <option>Meta Cloud API (Nativo)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">API Key / Token BSP</label>
                      <input type="password" placeholder="D3A-..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Fan Pages Config */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Target className="w-4 h-4 text-blue-600" /> Redes Sociales (Meta)</h3>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800">Editar</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Page ID (Facebook)</label>
                      <input type="text" placeholder="103847593..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Instagram Account ID</label>
                      <input type="text" placeholder="178414..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Page Access Token</label>
                      <input type="password" placeholder="EAAQx..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Pixel Config */}
                <div className="p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Target className="w-4 h-4 text-purple-600" /> Píxel de Meta</h3>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800">Editar</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">ID Píxel</label>
                      <input type="text" readOnly className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600" value={selectedStore.meta_pixel_id || 'No configurado'} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Products & AI Insights Module */}
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-600" /> Catálogo y Retroalimentación IA
                  </h3>
                  <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Nuevo Producto
                  </button>
                </div>
                
                {/* Product Card with AI Insights */}
                <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl border border-gray-100 overflow-hidden">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">Smartwatch X8 Pro</h4>
                      <div className="flex gap-3 mt-2 text-xs font-semibold text-gray-500">
                        <span className="bg-white border border-gray-200 px-2 py-1 rounded-md">Ad_ID / Reglas RAG Activas</span>
                        <span className="bg-white border border-gray-200 px-2 py-1 rounded-md">Precio Local: $120.000 COP</span>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 shadow-soft hover:bg-gray-50">
                      Editar Prompt / Info
                    </button>
                  </div>
                  
                  {/* AI Feedback Loop Panel */}
                  <div className="p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50">
                    <h5 className="text-sm font-bold text-indigo-900 flex items-center gap-2 mb-4">
                      <BrainCircuit className="w-4 h-4 text-indigo-600" /> Insights de IA (Ciclo de Retroalimentación 360°)
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Social Fricction */}
                      <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <h6 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-orange-500"/> Fricción en Anuncios (Redes Sociales)</h6>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex justify-between items-center"><span className="font-medium text-gray-900">"¿Tienen garantía?"</span> <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">34 casos</span></li>
                          <li className="flex justify-between items-center"><span className="font-medium text-gray-900">"¿Se puede pagar al recibir?"</span> <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">28 casos</span></li>
                        </ul>
                        <p className="text-xs text-indigo-600 mt-3 font-medium bg-indigo-50 p-2 rounded-lg">💡 <span className="font-bold">Sugerencia IA para el Media Buyer:</span> Agrega un banner gigante de "PAGO CONTRA ENTREGA" en el video del anuncio.</p>
                      </div>
                      
                      {/* WA Friction */}
                      <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
                        <h6 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1"><TrendingDown className="w-3 h-3 text-red-500"/> Fricción de Venta (WhatsApp)</h6>
                        <ul className="space-y-2 text-sm text-gray-700">
                          <li className="flex justify-between items-center"><span className="font-medium text-gray-900">El envío a regiones es muy caro</span> <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">45 ventas caídas</span></li>
                          <li className="flex justify-between items-center"><span className="font-medium text-gray-900">Buscaban color plateado</span> <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold">18 ventas caídas</span></li>
                        </ul>
                        <p className="text-xs text-purple-600 mt-3 font-medium bg-purple-50 p-2 rounded-lg">💡 <span className="font-bold">Sugerencia IA para el Importador:</span> Importa stock del color plateado de inmediato (Mucha demanda perdida).</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <Store className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium text-sm">Selecciona o crea una tienda para ver su configuración</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
