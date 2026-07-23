import { useState, useEffect } from 'react';
import { Store, Smartphone, Target, Plus, ShoppingBag, Loader2, Save, X, AlertTriangle, RefreshCw, RefreshCcw, Wifi, WifiOff, Phone, Zap, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Stores() {
  const [selectedCountry, setSelectedCountry] = useState('Colombia');
  const [activeCountries, setActiveCountries] = useState<string[]>(['Colombia']);
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [waNumber, setWaNumber] = useState<any>(null);
  const [loadingWa, setLoadingWa] = useState(false);
  const [billingInfo, setBillingInfo] = useState<any>(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  
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

  // Cargar datos del pool de WhatsApp cuando cambia la tienda seleccionada
  useEffect(() => {
    if (!selectedStore?.id) { setWaNumber(null); setBillingInfo(null); return; }
    setLoadingWa(true);
    setLoadingBilling(true);
    
    supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('store_id', selectedStore.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setWaNumber(data);
        setLoadingWa(false);
      });

    // Fetch billing stats
    fetch(`/api/meta/billing?store_id=${selectedStore.id}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) setBillingInfo(data);
        setLoadingBilling(false);
      })
      .catch(() => setLoadingBilling(false));

  }, [selectedStore?.id]);

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
              </div>

              {/* ═══ WHATSAPP CONNECTION CARD ═══ */}
              <div className="rounded-2xl overflow-hidden mb-6" style={{background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)'}}>
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: 'linear-gradient(135deg, #22c55e, #16a34a)'}}>
                        <Phone className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold text-sm flex items-center gap-2">
                          WhatsApp Cloud API
                          {loadingWa ? (
                            <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                          ) : waNumber ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Conectado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Sin número
                            </span>
                          )}
                        </h3>
                        <p className="text-gray-400 text-xs mt-0.5">Conexión directa vía Meta Business Platform</p>
                      </div>
                    </div>
                    {/* Kill Switch Toggle */}
                    {waNumber && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase" style={{color: waNumber.is_active ? '#4ade80' : '#f87171'}}>
                          {waNumber.is_active ? '🟢 Activo' : '🔴 Pausado'}
                        </span>
                        <button
                          onClick={async () => {
                            const newVal = !waNumber.is_active;
                            setWaNumber({...waNumber, is_active: newVal});
                            await (supabase as any).from('whatsapp_numbers').update({is_active: newVal}).eq('id', waNumber.id);
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            waNumber.is_active ? 'bg-green-500' : 'bg-gray-600'
                          }`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                            waNumber.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Warning when paused */}
                  {waNumber && !waNumber.is_active && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
                      <WifiOff className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-xs text-red-300 font-medium">
                        El bot de WhatsApp está <strong className="text-red-200">PAUSADO</strong>. Los mensajes se guardan en el CRM pero la IA no responde automáticamente.
                      </p>
                    </div>
                  )}

                  {/* Phone Number Card */}
                  {loadingWa ? (
                    <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      <span className="text-gray-400 text-sm">Cargando número...</span>
                    </div>
                  ) : waNumber ? (
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 flex items-center justify-between border border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background: 'linear-gradient(135deg, #22c55e, #15803d)'}}>
                          <Wifi className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Número Conectado</p>
                          <p className="text-white text-lg font-bold tracking-wide">{waNumber.phone_number} <span className="text-gray-400 text-sm font-normal">({waNumber.display_name})</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {waNumber.business_manager || 'Meta Business'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3 border border-white/10">
                      <WifiOff className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-400 text-sm">Esta tienda no tiene un número de WhatsApp asignado.</span>
                    </div>
                  )}

                  {/* Technical Details (collapsed by default) */}
                  {waNumber && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Phone Number ID</p>
                        <p className="text-gray-300 text-xs font-mono">{waNumber.phone_number_id}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">WABA ID</p>
                        <p className="text-gray-300 text-xs font-mono">{waNumber.waba_id}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">Access Token</p>
                        <p className="text-gray-300 text-xs font-mono truncate">••••••••{waNumber.access_token?.slice(-8) || '---'}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><CreditCard className="w-3 h-3"/> Tarjeta</p>
                        <div className="flex items-center gap-1">
                           <span className="text-gray-400 text-xs font-mono mt-0.5">••••</span>
                           <input
                             type="text"
                             maxLength={4}
                             placeholder="1234"
                             className="bg-transparent text-gray-300 text-xs font-mono border-b border-gray-600 focus:border-blue-400 focus:outline-none w-10 text-center pb-0.5"
                             value={waNumber.payment_card_last_four || ''}
                             onChange={(e) => setWaNumber({...waNumber, payment_card_last_four: e.target.value.replace(/\D/g, '')})}
                             onBlur={async (e) => {
                               if (waNumber.id) {
                                 await (supabase as any).from('whatsapp_numbers').update({payment_card_last_four: e.target.value}).eq('id', waNumber.id);
                               }
                             }}
                           />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══ PANEL DE COSTOS & BILLING ═══ */}
              <div className="rounded-2xl p-6 bg-white border border-gray-200 shadow-sm mb-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span className="text-xl">💰</span> Gastos del Mes ({billingInfo?.month || new Date().toISOString().substring(0,7)})
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Control de costos de APIs y motores de IA para esta tienda.</p>
                  </div>
                  {loadingBilling && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Costos IA */}
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Inteligencia Artificial</p>
                      <span className="bg-purple-200 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Router v2</span>
                    </div>
                    <p className="text-3xl font-black text-purple-900 mb-1">${(billingInfo?.ai?.total_cost_usd || 0).toFixed(4)} <span className="text-sm font-normal text-purple-600">USD</span></p>
                    <p className="text-xs text-purple-700">{(billingInfo?.ai?.total_tokens || 0).toLocaleString()} tokens consumidos</p>
                  </div>

                  {/* Costos Meta */}
                  <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-green-600 uppercase tracking-wide">WhatsApp Meta</p>
                      <span className="bg-green-200 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Cloud API</span>
                    </div>
                    <p className="text-3xl font-black text-green-900 mb-1">
                      {billingInfo?.meta?.status === 'APPROVED' ? <span className="text-sm">Activo</span> : <span className="text-sm">Cons. WABA</span>}
                    </p>
                    <p className="text-xs text-green-700">Moneda: {billingInfo?.meta?.currency || 'USD'}</p>
                  </div>

                  {/* Costos Google Maps */}
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">Google Maps</p>
                      <span className="bg-blue-200 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Street View</span>
                    </div>
                    <p className="text-3xl font-black text-blue-900 mb-1">${(billingInfo?.maps?.total_cost_usd || 0).toFixed(4)} <span className="text-sm font-normal text-blue-600">USD</span></p>
                    <p className="text-xs text-blue-700">{(billingInfo?.maps?.requests || 0).toLocaleString()} fotos ($200 gratis/mes)</p>
                  </div>
                </div>

                {billingInfo?.meta?.error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-red-800 mb-1">Alerta de Conexión Meta</h4>
                      <p className="text-xs text-red-700">
                        Detectamos un error con los permisos de esta línea de WhatsApp: <br/>
                        <code className="bg-white/50 px-1 py-0.5 rounded font-mono text-red-900 mt-1 block">{billingInfo.meta.error}</code>
                      </p>
                      <p className="text-xs text-red-600 mt-2 font-medium">
                        Solución: Ve a Meta, genera un nuevo Token Permanente asegurándote de seleccionar TODOS los permisos (incluyendo whatsapp_business_management), y pégalo en esta tienda.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ═══ SHOPYEASY WEBHOOK ═══ */}
              <div className="rounded-2xl p-5 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h5 className="font-bold text-emerald-900 text-sm">Webhook ShopyEasy</h5>
                    <p className="text-xs text-emerald-600">Pega esta URL en ShopyEasy para recibir pedidos y carritos abandonados.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={`${window.location.origin}/api/webhooks/shopyeasy?storeId=${selectedStore.id}`} 
                    className="flex-1 px-3 py-2 border border-emerald-200 rounded-lg text-sm bg-white text-gray-600 font-mono" 
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/shopyeasy?storeId=${selectedStore.id}`);
                      alert('URL copiada al portapapeles');
                    }}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors"
                  >
                    Copiar URL
                  </button>
                </div>
              </div>

              {/* ═══ TRACKING AVANZADO ═══ */}
              <div className="border-t border-gray-200 pt-6">
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

