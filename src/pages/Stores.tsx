import { useState, useEffect } from 'react';
import { Store, Smartphone, Target, Plus, ShoppingBag, Loader2, Save, X, AlertTriangle, RefreshCw, RefreshCcw, CheckCircle2, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Stores() {
  const [selectedCountry, setSelectedCountry] = useState('Colombia');
  const [activeCountries, setActiveCountries] = useState<string[]>(['Colombia']);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal/Form State
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newWaba, setNewWaba] = useState('');
  const [newPixel, setNewPixel] = useState('');
  const [syncingStores, setSyncingStores] = useState(false);
  const [importingCarts, setImportingCarts] = useState(false);
  


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

      // 2. Traer TODAS las tiendas para extraer los países únicos
      if (orgId) {
        const { data: allStoresData } = await supabase
          .from('stores')
          .select('*')
          .eq('organization_id', orgId)
          .order('name');
          
        if (allStoresData) {
          const uniqueCountries = Array.from(new Set(allStoresData.map((s: any) => s.country))).sort();
          if (uniqueCountries.length > 0) {
            setActiveCountries(uniqueCountries);
            
            // Si el país seleccionado actual no está en la lista (por ejemplo, al borrar), selecciona el primero
            if (!uniqueCountries.includes(selectedCountry)) {
              setSelectedCountry(uniqueCountries[0]);
              // La actualización de selectedCountry disparará el useEffect de nuevo
              return;
            }
          } else {
            setActiveCountries(['Colombia']);
          }

          // Filtrar tiendas solo para el país seleccionado
          const filtered = allStoresData.filter((s: any) => s.country === selectedCountry);
          setStores(filtered);
          if (filtered && filtered.length > 0) {
            setSelectedStore(filtered[0]);
          } else {
            setSelectedStore(null);
          }
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



  async function handleSyncStores() {
    setSyncingStores(true);
    try {
      const res = await fetch('https://shopyeasy-seven.vercel.app/api/chatify/export-stores?secret=chatify_sync_2026_x');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Unknown error fetching stores');

      let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      if (!orgs || orgs.length === 0) throw new Error("No organization found");
      const orgId = (orgs as any)[0].id;

      const countryMap: Record<string, string> = {
        'CO': 'Colombia',
        'MX': 'México',
        'AR': 'Argentina',
        'CL': 'Chile',
        'PE': 'Perú',
        'EC': 'Ecuador'
      };

      let imported = 0;
      for (const shopyStore of data.stores) {
        const mappedCountry = countryMap[shopyStore.country] || shopyStore.country;
        
        const { data: existing } = await supabase.from('stores')
          .select('id')
          .eq('name', shopyStore.name)
          .eq('country', mappedCountry)
          .single();
        
        if (!existing) {
          await supabase.from('stores').insert({
            organization_id: orgId,
            name: shopyStore.name,
            country: mappedCountry
          } as any);
          imported++;
        }
      }

      alert(`Sincronización completada. Se importaron ${imported} tiendas nuevas.`);
      loadStores();
    } catch (error: any) {
      console.error(error);
      alert("Error al sincronizar: " + error.message);
    }
    setSyncingStores(false);
  }

  async function handleImportAbandonedCarts() {
    setImportingCarts(true);
    try {
      // 1. Obtener todas las tiendas de Supabase
      const { data } = await supabase.from('stores').select('id, name, country').order('name');
      const localStores: any[] = data || [];
      if (!localStores.length) throw new Error("No hay tiendas locales para cruzar");

      // 2. Llamar a la API de Shopyeasy
      const response = await fetch('https://shopyeasy-seven.vercel.app/api/chatify/export-abandoned?secret=chatify_sync_2026_x');
      if (!response.ok) throw new Error("Error fetching abandoned carts");
      const result = await response.json();
      if (!result.success || !result.data) throw new Error("Formato de respuesta invalido");

      const countryMap: Record<string, string> = {
        'CO': 'Colombia',
        'MX': 'México',
        'AR': 'Argentina',
        'CL': 'Chile',
        'PE': 'Perú',
        'EC': 'Ecuador'
      };

      let imported = 0;
      
      for (const cart of result.data) {
        const mappedCountry = countryMap[cart.storeCountry] || cart.storeCountry;
        
        // Buscar la tienda local (ignorando mayúsculas/minúsculas)
        const store = localStores.find((s: any) => 
          s.name.toLowerCase() === cart.storeName.toLowerCase() && 
          s.country.toLowerCase() === mappedCountry.toLowerCase()
        );
        if (!store) continue; // Si no encontramos la tienda, saltamos

        // Formatear teléfono
        let phone = cart.customerPhone.replace(/[^\d+]/g, '');
        if (phone.length === 10) phone = `57${phone}`;

        // Verificar si ya existe el lead para esta tienda específica
        const { data: existing } = await supabase.from('leads')
          .select('id')
          .eq('store_id', store.id)
          .eq('phone', phone)
          .maybeSingle();

        if (existing) continue; // Ya existe en el CRM

        // Insertar Lead
        const { error } = await supabase.from('leads').insert({
          store_id: store.id,
          name: cart.customerName,
          phone: phone,
          traffic_source: 'Shopyeasy Webhook (Histórico)',
          board_type: 'remarketing_carts',
          status: 'contact_1', // Re-contacto 1
          notes: `Order ID: ${cart.id || 'N/A'}\nCity: ${cart.city}\nAddress: ${cart.address}\nProduct: ${cart.productName}`
        } as any);

        if (!error) imported++;
        else console.error("Error insertando lead:", error);
      }

      alert(`Importación completada. Se importaron ${imported} carritos abandonados al CRM de Remarketing.`);
    } catch (error: any) {
      alert(`Error al importar: ${error.message}`);
    } finally {
      setImportingCarts(false);
    }
  }

  const handleSaveTracking = async () => {
    if (!selectedStore) return;
    setSavingTracking(true);
    try {
      const { error } = await (supabase as any).from('stores').update({
        meta_pixel_id: selectedStore.meta_pixel_id,
        meta_capi_token: selectedStore.meta_capi_token,
        tiktok_pixel_id: selectedStore.tiktok_pixel_id,
        tiktok_access_token: selectedStore.tiktok_access_token,
        google_conversion_id: selectedStore.google_conversion_id,
        ga4_measurement_id: selectedStore.ga4_measurement_id,
        ga4_api_secret: selectedStore.ga4_api_secret
      }).eq('id', selectedStore.id);
      if (error) throw error;
      alert('Píxeles guardados exitosamente');
    } catch(e) {
      alert('Error al guardar los píxeles');
    }
    setSavingTracking(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 relative">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Organización Multitienda</h1>
          <p className="mt-2 text-sm text-gray-500">
            Base de Datos Conectada: Guarda tus tiendas en la nube de Supabase.
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Agregar Tienda Manual
          </button>
          <button
            onClick={handleImportAbandonedCarts}
            disabled={importingCarts}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all"
          >
            {importingCarts ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {importingCarts ? 'Importando...' : 'Importar Carritos'}
          </button>
          <button 
            onClick={handleSyncStores}
            disabled={syncingStores}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            {syncingStores ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShoppingBag className="w-4 h-4 mr-2" />}
            {syncingStores ? "Sincronizando..." : "Sincronizar Shopyeasy"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card rounded-2xl p-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">🌎 Paises Activos</h3>
            <div className="space-y-1">
              {activeCountries.map((country) => (
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
                        <h5 className="font-bold text-blue-900 flex items-center gap-2"><Smartphone className="w-4 h-4"/> WhatsApp API (Twilio Partner)</h5>
                        <p className="text-xs text-blue-700 mt-1">Podrás ingresar tu número de WhatsApp una vez guardes la tienda inicial.</p>
                      </div>
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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Store className="text-blue-600" /> Configuración: {selectedStore.name}
                </h2>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedStore.id);
                    alert("¡ID copiado al portapapeles! Ahora pégalo en Make.com");
                  }}
                  className="bg-purple-100 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-200 flex items-center gap-2 transition-colors"
                >
                  <FileText className="w-3 h-3" /> Copiar ID para Make.com
                </button>
              </div>

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
                  </div>

                  <h4 className="font-bold text-gray-900 mt-6 mb-3 border-b pb-2">Integraciones y APIs (Webhooks)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mb-2">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h5 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <Smartphone className="w-4 h-4 text-blue-600" /> WhatsApp API (Twilio Partner)
                          </h5>
                          <p className="text-xs text-gray-500 mt-1">Ingresa el número telefónico que compraste y conectaste en la consola de Twilio.</p>
                        </div>
                        <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-600 shadow-sm transition-colors">
                          Abrir Consola Twilio
                        </a>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-1.5">Número Telefónico de Twilio</label>
                          <input 
                            type="text" 
                            value={selectedStore.twilio_phone_number || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setSelectedStore({...selectedStore, twilio_phone_number: val});
                              // @ts-ignore
                              await supabase.from('stores').update({twilio_phone_number: val}).eq('id', selectedStore.id);
                            }}
                            onBlur={() => {
                              const el = document.getElementById('toast-success');
                              if (el) {
                                el.classList.remove('hidden');
                                setTimeout(() => el.classList.add('hidden'), 3000);
                              }
                            }}
                            placeholder="+18106666654"
                            className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium text-gray-900"
                          />
                          <p className="text-[10px] text-gray-500 mt-1">Asegúrate de incluir el código de país (ej. +1 o +57).</p>
                        </div>
                      </div>
                      
                      <div id="toast-success" className="hidden mt-3 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                        <CheckCircle2 className="w-4 h-4" /> ¡Número guardado exitosamente en la base de datos!
                      </div>
                    </div>

                    {/* Meta WhatsApp Cloud API (Beta) */}
                    <div className="col-span-1 md:col-span-2 bg-purple-50 p-4 rounded-xl border border-purple-100 mb-2">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <h5 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-purple-600" /> WhatsApp API Oficial (Meta Cloud API)
                              {/* Connection indicator */}
                              {(selectedStore as any).meta_access_token && (selectedStore as any).meta_phone_number_id ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Conectado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Sin configurar
                                </span>
                              )}
                            </h5>
                            <p className="text-xs text-purple-700 mt-1">Conexión directa con Meta (sin Twilio). Producción real.</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* ON/OFF Toggle */}
                          {(selectedStore as any).meta_access_token && (selectedStore as any).meta_phone_number_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-purple-700 uppercase">
                                {(selectedStore as any).meta_wa_active !== false ? '🟢 Activo' : '🔴 Pausado'}
                              </span>
                              <button
                                onClick={async () => {
                                  const newVal = (selectedStore as any).meta_wa_active === false ? true : false;
                                  setSelectedStore({...selectedStore, meta_wa_active: newVal} as any);
                                  // @ts-ignore
                                  await supabase.from('stores').update({meta_wa_active: newVal}).eq('id', selectedStore.id);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                  (selectedStore as any).meta_wa_active !== false 
                                    ? 'bg-green-500' 
                                    : 'bg-gray-300'
                                }`}
                              >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                                  (selectedStore as any).meta_wa_active !== false ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                              </button>
                            </div>
                          )}
                          <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="bg-purple-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-700 shadow-sm transition-colors">
                            Meta Developers
                          </a>
                        </div>
                      </div>

                      {/* Warning when paused */}
                      {(selectedStore as any).meta_wa_active === false && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                          <span className="text-red-500 text-lg">⚠️</span>
                          <p className="text-xs text-red-700 font-medium">
                            El bot de WhatsApp está <strong>PAUSADO</strong>. Los mensajes entrantes NO serán procesados ni respondidos automáticamente. Activa el switch para reanudar.
                          </p>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1.5">Meta Access Token (System User)</label>
                          <input 
                            type="password" 
                            value={(selectedStore as any).meta_access_token || ''}
                            onChange={async (e) => {
                              const val = e.target.value;
                              setSelectedStore({...selectedStore, meta_access_token: val} as any);
                              // @ts-ignore
                              await supabase.from('stores').update({meta_access_token: val}).eq('id', selectedStore.id);
                            }}
                            placeholder="EAACw..."
                            className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 font-medium text-gray-900"
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1.5">Phone Number ID</label>
                            <input 
                              type="text" 
                              value={(selectedStore as any).meta_phone_number_id || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setSelectedStore({...selectedStore, meta_phone_number_id: val} as any);
                                // @ts-ignore
                                await supabase.from('stores').update({meta_phone_number_id: val}).eq('id', selectedStore.id);
                              }}
                              placeholder="1234567890"
                              className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 font-medium text-gray-900"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-purple-800 uppercase tracking-wider mb-1.5">WhatsApp Business Account ID</label>
                            <input 
                              type="text" 
                              value={(selectedStore as any).waba_id || ''}
                              onChange={async (e) => {
                                const val = e.target.value;
                                setSelectedStore({...selectedStore, waba_id: val} as any);
                                // @ts-ignore
                                await supabase.from('stores').update({waba_id: val}).eq('id', selectedStore.id);
                              }}
                              placeholder="2508397522873921"
                              className="w-full px-4 py-3 bg-white border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 font-medium text-gray-900"
                            />
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

              {/* Conexión Redes Sociales (Make.com) */}
              <div className="mt-8 border-t border-gray-200 pt-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-600" /> Redes Sociales (Para CRM Make.com)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Vincula los IDs de Facebook e Instagram para que la IA responda comentarios automáticamente.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      if (!selectedStore) return;
                      try {
                        const { error } = await (supabase as any).from('stores').update({
                          fb_page_id: selectedStore.fb_page_id,
                          ig_account_id: selectedStore.ig_account_id,
                        }).eq('id', selectedStore.id);
                        if (error) throw error;
                        alert('Redes Sociales guardadas exitosamente');
                      } catch(e) {
                        alert('Error al guardar Redes Sociales');
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
                  >
                    <Save className="w-4 h-4" /> Guardar Redes
                  </button>
                </div>

                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold">f</div>
                      <h4 className="font-bold text-slate-700">Facebook Page ID</h4>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">ID de la Fan Page</label>
                      <input 
                        type="text" 
                        value={selectedStore.fb_page_id || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, fb_page_id: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600" 
                        placeholder="1234567890" 
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded bg-pink-100 flex items-center justify-center text-pink-600 font-bold">ig</div>
                      <h4 className="font-bold text-slate-700">Instagram Account ID</h4>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">ID de la Cuenta de Instagram</label>
                      <input 
                        type="text" 
                        value={selectedStore.ig_account_id || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, ig_account_id: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-pink-600" 
                        placeholder="0987654321" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracking Avanzado (API) */}
              <div className="mt-8 border-t border-gray-200 pt-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" /> Tracking Avanzado (API)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Configura Facebook CAPI, TikTok Events API y Google Ads para esta tienda.</p>
                  </div>
                  <button 
                    onClick={handleSaveTracking}
                    disabled={savingTracking}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-70"
                  >
                    {savingTracking ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Guardar Píxeles
                  </button>
                </div>

                <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Facebook */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold">f</div>
                      <h4 className="font-bold text-slate-700">Facebook CAPI</h4>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Pixel ID</label>
                      <input 
                        type="text" 
                        value={selectedStore.meta_pixel_id || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, meta_pixel_id: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600" 
                        placeholder="1234567890" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Access Token</label>
                      <input 
                        type="password" 
                        value={selectedStore.meta_capi_token || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, meta_capi_token: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600" 
                        placeholder="EAA..." 
                      />
                    </div>
                  </div>

                  {/* TikTok */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-bold">t</div>
                      <h4 className="font-bold text-slate-700">TikTok Events API</h4>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Pixel ID / Code</label>
                      <input 
                        type="text" 
                        value={selectedStore.tiktok_pixel_id || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, tiktok_pixel_id: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-black" 
                        placeholder="CB..." 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Access Token</label>
                      <input 
                        type="password" 
                        value={selectedStore.tiktok_access_token || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, tiktok_access_token: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-black" 
                        placeholder="Token..." 
                      />
                    </div>
                  </div>

                  {/* Google Analytics 4 */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center text-orange-600 font-bold">G4</div>
                      <h4 className="font-bold text-slate-700">Google Analytics 4</h4>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Measurement ID</label>
                      <input 
                        type="text" 
                        value={selectedStore.ga4_measurement_id || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, ga4_measurement_id: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-600" 
                        placeholder="G-XXXXXXX" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">API Secret</label>
                      <input 
                        type="password" 
                        value={selectedStore.ga4_api_secret || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, ga4_api_secret: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-orange-600" 
                        placeholder="Secret..." 
                      />
                    </div>
                    <div className="pt-2 text-[10px] text-slate-500 leading-relaxed font-semibold">
                      Server-Side Tracking. Genera el API Secret en GA4 {'>'} Admin {'>'} Data Streams {'>'} Measurement Protocol API Secrets.
                    </div>
                  </div>

                  {/* Google Ads */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center text-red-600 font-bold">G</div>
                      <h4 className="font-bold text-slate-700">Google Ads</h4>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Conversion ID</label>
                      <input 
                        type="text" 
                        value={selectedStore.google_conversion_id || ''}
                        onChange={(e) => setSelectedStore({...selectedStore, google_conversion_id: e.target.value})}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-600" 
                        placeholder="AW-..." 
                      />
                    </div>
                    <div className="pt-2 text-xs text-slate-500 leading-relaxed">
                      Para Google Ads, requerimos el ID para conversiones offline. Asegúrate de configurar la captura de `gclid` en tus links.
                    </div>
                           {/* Fin Tracking Avanzado */}
            </div>                </div>
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
