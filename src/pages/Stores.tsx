import { useState, useEffect } from 'react';
import { Store, Smartphone, Target, Plus, ShoppingBag, Loader2, Save, X, BrainCircuit, TrendingDown, AlertTriangle, FileText, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Stores() {
  const [selectedCountry, setSelectedCountry] = useState('Colombia');
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal/Form State
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newWaba, setNewWaba] = useState('');
  const [newPixel, setNewPixel] = useState('');
  const [showToken, setShowToken] = useState(false);
  
  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductPromptWA, setNewProductPromptWA] = useState('');
  const [newProductPromptSocial, setNewProductPromptSocial] = useState('');

  useEffect(() => {
    loadStores();
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedStore) {
      loadProducts(selectedStore.id);
    } else {
      setProducts([]);
    }
  }, [selectedStore]);

  async function loadProducts(storeId: string) {
    setLoadingProducts(true);
    try {
      const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      if (!error) {
        setProducts(data || []);
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
    setLoadingProducts(false);
  }

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

  async function handleSaveProduct() {
    if (!newProductName || !newProductPrice || !selectedStore) return;
    setSavingProduct(true);
    try {
      const master_prompt = JSON.stringify({ whatsapp: newProductPromptWA, social: newProductPromptSocial });
      const { data, error } = await supabase.from('products').insert({
        store_id: selectedStore.id,
        name: newProductName,
        price: parseFloat(newProductPrice),
        master_prompt
      } as any).select().single();

      if (data && !error) {
        setProducts([data, ...products]);
        setIsAddingProduct(false);
        setNewProductName('');
        setNewProductPrice('');
        setNewProductPromptWA('');
        setNewProductPromptSocial('');
      } else {
        console.error("Supabase insert error:", error);
      }
    } catch (error) {
      console.error("Error saving product:", error);
    }
    setSavingProduct(false);
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Tienda</label>
                    <input value={newStoreName} onChange={e => setNewStoreName(e.target.value)} type="text" placeholder="Ej: Dropi Belleza" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Logo (Sube una Imagen)</label>
                    <input type="file" accept="image/*" className="w-full px-4 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Línea Móvil Virtual Asignada</label>
                    <select className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500 mb-2">
                      <option>Selecciona un número virtual...</option>
                      <option>+57 300 123 4567 (Colombia)</option>
                      <option>+52 55 1234 5678 (México)</option>
                    </select>
                    <p className="text-[11px] text-gray-500 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
                      <span>¿No tienes línea? Compra un número en el menú <Link to="/virtual-sims" className="text-blue-600 font-bold hover:underline">Líneas y SIMs Virtuales</Link>.</span>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ID del Píxel (Opcional)</label>
                    <input value={newPixel} onChange={e => setNewPixel(e.target.value)} type="text" placeholder="123456789" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-blue-500" />
                  </div>
                  <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-bold text-blue-900 flex items-center gap-2"><Smartphone className="w-4 h-4"/> WhatsApp API (Meta)</h5>
                        <p className="text-xs text-blue-700 mt-1">Conecta con Facebook para autollenar los permisos de Meta Cloud API.</p>
                      </div>
                      <button className="bg-[#1877F2] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-[#0C63D4] flex items-center gap-2 transition-colors">
                        Conectar con Facebook
                      </button>
                    </div>
                  </div>
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
                <div className="col-span-1 lg:col-span-3 p-5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Smartphone className="w-4 h-4 text-green-600" /> WhatsApp & Integraciones</h3>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800">Editar</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Nombre de la Tienda</label>
                      <input type="text" placeholder="Ej: Dropi Belleza" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Logo (Sube una Imagen)</label>
                      <input type="file" accept="image/*" className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:ring-1 focus:ring-blue-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Línea Móvil Virtual Asignada</label>
                      <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:ring-1 focus:ring-blue-500 mb-2">
                        <option>Selecciona un número virtual...</option>
                        <option>+57 300 123 4567 (Colombia)</option>
                        <option>+52 55 1234 5678 (México)</option>
                      </select>
                      <p className="text-[11px] text-gray-500 flex items-start gap-1">
                        <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
                        <span>¿No tienes línea? Compra un número en el menú <Link to="/virtual-sims" className="text-blue-600 font-bold hover:underline">Líneas y SIMs Virtuales</Link>.</span>
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">ID del Pixel (Opcional)</label>
                      <input type="text" placeholder="123456789" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-600 focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>

                  <h4 className="font-bold text-gray-900 mt-6 mb-3 border-b pb-2">Integraciones y APIs (Webhooks)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h5 className="font-bold text-blue-900 flex items-center gap-2"><Smartphone className="w-4 h-4"/> WhatsApp Business (Meta Cloud API)</h5>
                          <p className="text-xs text-blue-700 mt-1">La integración oficial requiere que inicies sesión. Extraeremos tus tokens automáticamente.</p>
                        </div>
                        <button className="bg-[#1877F2] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#0C63D4] flex items-center gap-2 transition-colors">
                          Conectar con Facebook
                        </button>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-100 relative">
                        <div className="absolute inset-0 bg-white/0 pointer-events-none z-10 rounded-lg"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-blue-800 mb-1">WhatsApp Business Account ID (WABA)</label>
                            <input 
                              type="text" 
                              value={selectedStore.waba_id || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setSelectedStore({...selectedStore, waba_id: val});
                                // @ts-ignore
                                await supabase.from('stores').update({waba_id: val}).eq('id', selectedStore.id);
                              }}
                              placeholder="Ej: 104533035987112" 
                              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-blue-800 mb-1">Phone Number ID</label>
                            <input 
                              type="text" 
                              value={selectedStore.waba_number || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setSelectedStore({...selectedStore, waba_number: val});
                                // @ts-ignore
                                await supabase.from('stores').update({waba_number: val}).eq('id', selectedStore.id);
                              }}
                              placeholder="Ej: 102345678901234" 
                              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" 
                            />
                          </div>
                          <div className="md:col-span-2 relative">
                            <label className="block text-xs font-semibold text-blue-800 mb-1">Permanent Access Token</label>
                            <input 
                              type={showToken ? "text" : "password"} 
                              value={selectedStore.meta_access_token || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setSelectedStore({...selectedStore, meta_access_token: val});
                                // @ts-ignore
                                await supabase.from('stores').update({meta_access_token: val}).eq('id', selectedStore.id);
                              }}
                              placeholder="EAAGm0..." 
                              className="w-full px-3 py-2 pr-10 border border-blue-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" 
                            />
                            <button
                              type="button"
                              onClick={() => setShowToken(!showToken)}
                              className="absolute right-3 top-[26px] text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 bg-green-50 p-4 rounded-xl border border-green-100 mb-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="font-bold text-green-900 flex items-center gap-2"><ShoppingBag className="w-4 h-4"/> Integración Webhook ShopyEasy</h5>
                          <p className="text-xs text-green-700 mt-1">Copia esta URL y pégala en ShopyEasy para recibir pedidos y carritos abandonados automáticamente.</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={`${window.location.origin}/api/webhooks/shopyeasy?storeId=${selectedStore.id}`} 
                          className="flex-1 px-3 py-2 border border-green-200 rounded-lg text-sm bg-white text-gray-600 font-mono" 
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/shopyeasy?storeId=${selectedStore.id}`);
                            alert('URL copiada al portapapeles');
                          }}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700"
                        >
                          Copiar URL
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Template Manager */}
              <div className="mt-8 border-t border-gray-200 pt-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-600" /> Gestor de Plantillas IA
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Crea, edita y mide el éxito de tus plantillas oficiales para esta tienda.</p>
                  </div>
                  <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-soft flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" /> Generar con IA
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Template Card */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 flex gap-2">
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Aprobada</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Confirmación V1 (Con Foto)</h4>
                    <p className="text-xs text-gray-500 mb-3 uppercase font-semibold">Categoría: UTILITY</p>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 border border-gray-100 italic">
                      "Hola {'{{1}}'}, gracias por tu compra. Te muestro la foto real del {'{{2}}'} en color {'{{3}}'} que separaste."
                    </div>
                    <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Leídos</p>
                          <p className="text-sm font-bold text-gray-900">89%</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Respuesta</p>
                          <p className="text-sm font-bold text-green-600">64%</p>
                        </div>
                      </div>
                      <button className="text-xs font-bold text-blue-600 hover:text-blue-800">Editar (A/B Test)</button>
                    </div>
                  </div>

                  {/* Template Card 2 */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 flex gap-2">
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Aprobada</span>
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Carrito Abandonado V1</h4>
                    <p className="text-xs text-gray-500 mb-3 uppercase font-semibold">Categoría: MARKETING</p>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mb-4 border border-gray-100 italic">
                      "Hola {'{{1}}'}, notamos que no terminaste tu compra del {'{{2}}'}... ¿Tuviste algún problema?"
                    </div>
                    <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Leídos</p>
                          <p className="text-sm font-bold text-gray-900">75%</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Respuesta</p>
                          <p className="text-sm font-bold text-green-600">22%</p>
                        </div>
                      </div>
                      <button className="text-xs font-bold text-blue-600 hover:text-blue-800">Editar (A/B Test)</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products & AI Insights Module */}
              <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-indigo-600" /> Catálogo y Prompt IA
                  </h3>
                  <button onClick={() => setIsAddingProduct(true)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-soft flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Nuevo Producto
                  </button>
                </div>
                
                {/* Products List from Supabase */}
                {loadingProducts ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                ) : products.length === 0 ? (
                  <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-500">No hay productos creados en esta tienda.</p>
                  </div>
                ) : (
                  products.map(product => (
                    <div key={product.id} className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl border border-gray-100 overflow-hidden mb-4">
                      <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                        <div>
                          <h4 className="font-bold text-gray-900 text-lg">{product.name}</h4>
                          <div className="flex gap-3 mt-2 text-xs font-semibold text-gray-500">
                            <span className="bg-white border border-gray-200 px-2 py-1 rounded-md">ID: {product.id.split('-')[0]}</span>
                            <span className="bg-white border border-gray-200 px-2 py-1 rounded-md">Precio: ${Number(product.price).toLocaleString()}</span>
                          </div>
                        </div>
                        <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 shadow-soft hover:bg-gray-50">
                          Editar
                        </button>
                      </div>
                      {/* AI Knowledge Base Summary */}
                      <div className="p-5 bg-indigo-50/30">
                        <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                          <BrainCircuit className="w-3 h-3"/> Base de Conocimiento (RAG)
                        </h5>
                        <p className="text-xs text-gray-600 line-clamp-2 italic">
                          {product.master_prompt ? (
                            (() => {
                                try { 
                                  const parsed = JSON.parse(product.master_prompt); 
                                  return parsed.whatsapp || "No hay prompt configurado."; 
                                } catch(e) { 
                                  return product.master_prompt; 
                                }
                            })()
                          ) : "No hay prompt configurado."}
                        </p>
                      </div>
                    </div>
                  ))
                )}

                  {/* A/B Template Mapping */}
                  <div className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                    <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">🧩 Mapeo de Automatizaciones (A/B Testing)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Trigger: Confirmación de Pedido</label>
                        <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white">
                          <option>Plantilla: Confirmación V1 (Con Foto)</option>
                          <option>Plantilla: Confirmación V2 (Urgencia)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Trigger: Carrito Abandonado</label>
                        <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 bg-white">
                          <option>Plantilla: Carrito Abandonado V1</option>
                          <option>Plantilla: Carrito V2 (Oferta 10%)</option>
                        </select>
                      </div>
                    </div>
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
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
              <Store className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium text-sm">Selecciona o crea una tienda para ver su configuración</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Producto */}
      {isAddingProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center rounded-t-3xl z-10">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-indigo-600" /> Nuevo Producto
              </h2>
              <button onClick={() => setIsAddingProduct(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Producto</label>
                  <input value={newProductName} onChange={e => setNewProductName(e.target.value)} type="text" placeholder="Ej: Smartwatch X8 Pro" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">SKU / Referencia</label>
                  <input type="text" placeholder="Ej: SW-X8-PRO" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Precio de Venta</label>
                  <input value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} type="number" placeholder="Ej: 120000" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fotos del Producto</label>
                  <input type="file" multiple accept="image/*" className="w-full px-4 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-indigo-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                </div>
              </div>

              {/* RAG Prompt Builder */}
              <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <BrainCircuit className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-bold text-indigo-900">Entrenamiento del Agente IA (RAG por Canal)</h4>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1">
                      <Smartphone className="w-3 h-3"/> Prompt producto
                    </label>
                    <p className="text-[11px] text-indigo-600 mb-2 leading-tight">
                      Pega aquí el prompt generado con las reglas de venta (objeciones, envíos, garantías, etc).
                    </p>
                    <textarea 
                      value={newProductPromptWA}
                      onChange={e => setNewProductPromptWA(e.target.value)}
                      rows={3} 
                      className="w-full px-4 py-3 border border-indigo-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="Ej: Eres un vendedor experto. Ofrece envío gratis. El objetivo es que llenen el formulario de pago contra entrega."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-indigo-800 mb-1 flex items-center gap-1">
                      <Target className="w-3 h-3"/> Contexto para Redes Sociales (Comentarios)
                    </label>
                    <p className="text-[11px] text-indigo-600 mb-2 leading-tight">
                      Instrucciones sobre cómo responder a "Info", "Precio", o quejas públicas en Facebook/Instagram.
                    </p>
                    <textarea 
                      value={newProductPromptSocial}
                      onChange={e => setNewProductPromptSocial(e.target.value)}
                      rows={3} 
                      className="w-full px-4 py-3 border border-indigo-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="Ej: Si preguntan precio, decir '$120.000 COP con envío gratis'. Si piden info, dar un resumen corto e invitarlos a enviar un DM. Si hay una queja, pedir disculpas y solicitar el número de orden por interno."
                    ></textarea>
                  </div>
                </div>

                <button className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 w-full justify-center transition-colors">
                  Generar Base de Conocimiento (RAG)
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 p-6 flex justify-end gap-3 bg-gray-50 rounded-b-3xl">
              <button onClick={() => setIsAddingProduct(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-700 border border-gray-300 hover:bg-gray-100">
                Cancelar
              </button>
              <button 
                onClick={handleSaveProduct} 
                disabled={savingProduct || !newProductName || !newProductPrice}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-soft flex items-center gap-2 disabled:opacity-50"
              >
                {savingProduct ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
