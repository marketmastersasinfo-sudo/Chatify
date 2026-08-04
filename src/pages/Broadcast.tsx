import { useState, useEffect } from 'react';
import { Megaphone, Users, Filter, FileText, Send, AlertCircle, Loader2, BarChart2, CheckCircle2, TrendingUp, DollarSign, Eye, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export function Broadcast() {
  const { user } = useAuth();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'launcher' | 'analytics'>('launcher');
  const [step, setStep] = useState(1);
  
  // Data States
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  // Filter States
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [tag, setTag] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [geography, setGeography] = useState<string>('all');
  const [ltv, setLtv] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');

  // Computed
  const [audienceCount, setAudienceCount] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Launch State
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  useEffect(() => {
    if (user) loadStores();
  }, [user]);

  useEffect(() => {
    if (selectedStoreId) {
      loadProducts();
      calculateAudience();
      loadTemplates();
      if (activeTab === 'analytics') loadAnalytics();
    } else {
      setAudienceCount(0);
      setTemplates([]);
      setProducts([]);
    }
  }, [selectedStoreId, selectedProduct, tag, dateFrom, dateTo, geography, ltv, paymentStatus, activeTab]);

  async function loadStores() {
    try {
      let query = supabase.from('stores').select('id, name').order('name');
      if (user?.role !== 'SUPER_ADMIN') {
        const storeIds = user?.storeIds || [];
        if (storeIds.length === 0) {
          setStores([]);
          return;
        }
        query = query.in('id', storeIds);
      }
      
      const { data } = await query;
      setStores(data || []);
      if (data && data.length > 0) setSelectedStoreId((data as any[])[0].id);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadProducts() {
    if (!selectedStoreId) return;
    try {
      const { data } = await supabase.from('products').select('id, name').eq('store_id', selectedStoreId).order('name');
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadTemplates() {
    try {
      const { data } = await supabase.from('store_templates')
        .select('*')
        .eq('store_id', selectedStoreId)
        .eq('category', 'MARKETING')
        .eq('status', 'APPROVED');
      setTemplates(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function calculateAudience() {
    setIsCalculating(true);
    try {
      let query = supabase.from('leads').select('id, total_price').eq('store_id', selectedStoreId);
      
      if (tag !== 'all') {
        if (tag === 'vip') query = query.not('status', 'eq', 'lost');
        else query = query.eq('status', tag);
      }

      if (selectedProduct !== 'all') {
        const product = products.find(p => p.id === selectedProduct);
        if (product) query = query.ilike('product_name', `%${product.name}%`);
      }

      if (dateFrom) query = query.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        query = query.lte('created_at', end.toISOString());
      }

      if (geography !== 'all') {
        if (geography === 'principal') query = query.in('city', ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena']);
      }

      if (paymentStatus === 'delivered') query = query.eq('status', 'delivered');
      if (paymentStatus === 'paid') query = query.in('status', ['paid', 'delivered']);

      const { data, error } = await query;
      if (error) throw error;

      let finalLeads: any[] = data || [];
      if (ltv !== 'all') {
        const minAmount = parseInt(ltv);
        finalLeads = finalLeads.filter(l => (l.total_price || 0) >= minAmount);
      }
      setAudienceCount(finalLeads.length);
    } catch (err) {
      console.error(err);
      setAudienceCount(0);
    }
    setIsCalculating(false);
  }

  async function loadAnalytics() {
    setIsLoadingAnalytics(true);
    try {
      // Query broadcast queue to compute analytics
      const { data, error } = await supabase
        .from('broadcast_queue')
        .select(`
          id, status, created_at,
          store_templates ( template_name ),
          leads ( status, total_price )
        `)
        .eq('store_id', selectedStoreId);
        
      if (error) throw error;
      
      // Group by date (day) and template name
      const grouped: Record<string, any> = {};
      
      (data || []).forEach((row: any) => {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        const templateName = row.store_templates?.template_name || 'Desconocida';
        const key = `${date}_${templateName}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            date,
            templateName,
            total: 0,
            sent: 0,
            failed: 0,
            opened: 0,
            conversions: 0,
            revenue: 0,
          };
        }
        
        grouped[key].total++;
        if (row.status === 'sent' || row.status === 'read') grouped[key].sent++;
        if (row.status === 'failed') grouped[key].failed++;
        if (row.status === 'read') grouped[key].opened++;
        
        const lead = row.leads;
        if (lead && (lead.status === 'paid' || lead.status === 'delivered')) {
          grouped[key].conversions++;
          grouped[key].revenue += (lead.total_price || 0);
        }
      });
      
      setAnalyticsData(Object.values(grouped).sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error(err);
    }
    setIsLoadingAnalytics(false);
  }

  async function handleLaunch() {
    setIsLaunching(true);
    setLaunchError(null);
    setLaunchMessage(null);
    try {
      const productName = selectedProduct !== 'all' ? products.find(p => p.id === selectedProduct)?.name : 'all';

      const payload = {
        storeId: selectedStoreId,
        templateIds: selectedTemplateIds,
        tags: tag,
        dateFrom,
        dateTo,
        geography,
        ltv,
        paymentStatus,
        productName
      };
      
      const res = await fetch('/api/broadcast-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al lanzar');
      
      setLaunchMessage(json.message);
    } catch (err: any) {
      setLaunchError(err.message);
    }
    setIsLaunching(false);
  }

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-indigo-600" /> Centro de Ráfagas Masivas
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Segmenta, testea múltiples ofertas y mide tu ROAS en tiempo real.
          </p>
        </div>
        
        {/* Tienda Global */}
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
          <select value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} className="w-full bg-transparent font-bold text-gray-700 outline-none cursor-pointer">
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 pb-2">
        <button 
          onClick={() => setActiveTab('launcher')}
          className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'launcher' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Send className="w-4 h-4" /> Lanzador
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <BarChart2 className="w-4 h-4" /> Historial y Analíticas
        </button>
      </div>

      {/* ─── TAB: LANZADOR ─── */}
      {activeTab === 'launcher' && (
        <div className="space-y-6">
          {/* Stepper Header */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-3 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-indigo-100' : 'bg-gray-100'}`}>1</div>
                <span className="font-bold text-sm">Audiencia</span>
              </div>
              <div className={`flex-1 h-1 mx-4 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-100'}`}></div>
              <div className={`flex items-center gap-3 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-indigo-100' : 'bg-gray-100'}`}>2</div>
                <span className="font-bold text-sm">Ofertas A/B</span>
              </div>
              <div className={`flex-1 h-1 mx-4 rounded ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-100'}`}></div>
              <div className={`flex items-center gap-3 ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-indigo-100' : 'bg-gray-100'}`}>3</div>
                <span className="font-bold text-sm">Lanzar</span>
              </div>
            </div>
          </div>

          {/* Step 1: Audiencia */}
          {step === 1 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><Filter className="w-5 h-5 text-indigo-600"/> Segmentar Audiencia</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Producto de Interés (Remarketing)</label>
                  <select value={selectedProduct} onChange={e => setSelectedProduct(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50">
                    <option value="all">Cualquier producto</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Etiqueta de Cliente</label>
                  <select value={tag} onChange={e => setTag(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50">
                    <option value="all">Todos los contactos</option>
                    <option value="vip">Clientes VIP (Ya compraron)</option>
                    <option value="abandoned">Carritos Abandonados</option>
                    <option value="remarketing">Interesados sin compra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ubicación (Geografía)</label>
                  <select value={geography} onChange={e => setGeography(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-gray-50">
                    <option value="all">Todo el país</option>
                    <option value="principal">Solo ciudades principales</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 border-t border-gray-100 pt-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Desde</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Hasta</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-600" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Monto Gastado (LTV)</label>
                  <select value={ltv} onChange={e => setLtv(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="all">Cualquier monto</option>
                    <option value="50000">Más de $50.000</option>
                    <option value="150000">Más de $150.000</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado de Pago</label>
                  <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                    <option value="all">Cualquier estado</option>
                    <option value="paid">Pagados/Entregados</option>
                    <option value="delivered">Solo Entregados</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 bg-gradient-to-r from-indigo-50 to-blue-50 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between border border-indigo-100 gap-4">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-white rounded-xl shadow-sm">
                    {isCalculating ? <Loader2 className="w-8 h-8 text-indigo-600 animate-spin"/> : <Users className="w-8 h-8 text-indigo-600"/>}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-900 mb-1">Audiencia Calculada</p>
                    <p className="text-3xl font-black text-indigo-700">{audienceCount} <span className="text-base font-normal text-indigo-600">contactos viables</span></p>
                  </div>
                </div>
                <button 
                  onClick={() => setStep(2)} 
                  disabled={audienceCount === 0}
                  className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-soft text-lg"
                >
                  Continuar a Ofertas
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Plantillas A/B */}
          {step === 2 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Seleccionar Ofertas (Testing A/B)</h2>
                  <p className="text-sm text-gray-500 mt-1">Selecciona una o varias plantillas. El sistema dividirá tu audiencia para probar cuál vende más.</p>
                </div>
                <button onClick={() => setStep(1)} className="text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">Volver</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.length === 0 ? (
                  <div className="col-span-3 text-center py-12 text-gray-500">
                    No tienes plantillas de MARKETING aprobadas.
                  </div>
                ) : (
                  templates.map(t => {
                    const isSelected = selectedTemplateIds.includes(t.id);
                    const bodyText = t.meta_payload?.components?.find((c:any) => c.type === 'BODY')?.text || 'Sin texto';
                    const header = t.meta_payload?.components?.find((c:any) => c.type === 'HEADER');
                    
                    return (
                      <div 
                        key={t.id}
                        onClick={() => toggleTemplate(t.id)}
                        className={`relative rounded-2xl cursor-pointer transition-all border-2 overflow-hidden ${isSelected ? 'border-green-500 shadow-md ring-4 ring-green-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'}`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full z-10 shadow">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                        )}
                        
                        {/* WhatsApp Bubble Preview */}
                        <div className="bg-[#efeae2] p-4 h-64 overflow-y-auto">
                           <div className="bg-white rounded-lg p-3 shadow-sm text-sm relative max-w-[90%]">
                             {/* Mock Header */}
                             {header && header.format === 'IMAGE' && (
                               <div className="w-full h-32 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400">
                                 [Imagen Promocional]
                               </div>
                             )}
                             {header && header.format === 'VIDEO' && (
                               <div className="w-full h-32 bg-gray-200 rounded mb-2 flex items-center justify-center text-gray-400">
                                 [Video]
                               </div>
                             )}
                             {/* Body */}
                             <p className="whitespace-pre-wrap text-gray-800 text-[13px] leading-relaxed">
                               {bodyText.replace(/{{1}}/g, '[Nombre]').replace(/{{2}}/g, '[Producto]')}
                             </p>
                             <div className="text-right text-[10px] text-gray-400 mt-2">12:00 PM</div>
                           </div>
                        </div>

                        <div className="p-4 bg-white border-t border-gray-100">
                          <h4 className="font-bold text-gray-900 truncate" title={t.template_name}>{t.template_name}</h4>
                          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full mt-1 inline-block">Aprobada</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setStep(3)} 
                  disabled={selectedTemplateIds.length === 0}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-soft flex items-center gap-2 text-lg"
                >
                  <Users className="w-5 h-5" /> {selectedTemplateIds.length > 1 ? `Distribuir en ${selectedTemplateIds.length} Ofertas` : 'Usar esta Oferta'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Lanzamiento */}
          {step === 3 && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Send className="w-5 h-5 text-indigo-600"/> Confirmación de Ráfaga</h2>
                <button onClick={() => setStep(2)} className="text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 px-4 py-2 rounded-lg">Volver</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Resumen Numerico */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2"><BarChart2 className="w-5 h-5"/> Resumen Financiero</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                      <span className="text-gray-600 font-medium">Audiencia Total:</span>
                      <span className="font-black text-xl text-gray-900">{audienceCount}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                      <span className="text-gray-600 font-medium">Variaciones (A/B):</span>
                      <span className="font-black text-xl text-indigo-600">{selectedTemplateIds.length} Plantillas</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-gray-600 font-medium">Costo Inversión Meta:</span>
                      <span className="font-black text-2xl text-red-600">~ ${(audienceCount * 0.05).toFixed(2)} <span className="text-sm">USD</span></span>
                    </div>
                  </div>
                </div>

                {/* Info Anti Ban */}
                <div className="flex flex-col justify-center gap-4">
                  <div className="flex items-start gap-4 bg-green-50 p-5 rounded-2xl border border-green-100">
                    <div className="bg-green-100 p-2 rounded-full">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-green-900">Motor Anti-Ban Activado</h4>
                      <p className="text-sm text-green-800 mt-1">Los mensajes se enviarán en secuencias invisibles para evitar bloqueos por Spam.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 bg-orange-50 p-5 rounded-2xl border border-orange-100">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <AlertCircle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-orange-900">Tiempo de Despliegue</h4>
                      <p className="text-sm text-orange-800 mt-1">Estimado: <strong>{Math.ceil(audienceCount / 50)} minutos</strong>. Puedes cerrar esta ventana sin problema.</p>
                    </div>
                  </div>
                </div>
              </div>

              {launchMessage && (
                <div className="mb-6 p-4 bg-green-50 text-green-800 border border-green-200 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5"/> {launchMessage}
                </div>
              )}

              {launchError && (
                <div className="mb-6 p-4 bg-red-50 text-red-800 border border-red-200 rounded-xl font-bold flex items-center gap-2">
                  <AlertCircle className="w-5 h-5"/> {launchError}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button 
                  onClick={handleLaunch}
                  disabled={isLaunching || audienceCount === 0 || !!launchMessage}
                  className="w-full md:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-soft flex items-center justify-center gap-3 text-lg"
                >
                  {isLaunching ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />} 
                  {isLaunching ? 'Lanzando Ráfagas...' : 'Confirmar e Iniciar Ráfagas'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: ANALÍTICAS ─── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-indigo-600"/> Rendimiento y ROAS
            </h2>
            <p className="text-gray-500 mb-8 text-sm">Monitorea el embudo de ventas exacto de cada plantilla que has lanzado.</p>

            {isLoadingAnalytics ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Calculando métricas y ventas atribuidas...</p>
              </div>
            ) : analyticsData.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <BarChart2 className="w-12 h-12 text-gray-400 mx-auto mb-3"/>
                <h3 className="font-bold text-gray-900">No hay datos suficientes</h3>
                <p className="text-gray-500 text-sm mt-1">Lanza tu primera ráfaga para comenzar a medir tu ROAS.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {analyticsData.map((data, index) => {
                  const cost = data.sent * 0.05;
                  const roas = cost > 0 ? (data.revenue / cost) : 0;
                  const openRate = data.sent > 0 ? Math.round((data.opened / data.sent) * 100) : 0;
                  const conversionRate = data.sent > 0 ? ((data.conversions / data.sent) * 100).toFixed(1) : 0;

                  return (
                    <div key={index} className="bg-white border-2 border-gray-100 hover:border-indigo-100 transition-colors rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{data.date}</span>
                          <h3 className="text-lg font-black text-gray-900 mt-1">{data.templateName}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">ROAS</p>
                          <div className={`px-4 py-1.5 rounded-lg font-black text-lg ${roas > 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {roas.toFixed(2)}x
                          </div>
                        </div>
                      </div>

                      {/* Funnel Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                          <div className="flex items-center gap-2 text-gray-600 mb-2">
                            <Send className="w-4 h-4"/> <span className="font-semibold text-sm">Enviados</span>
                          </div>
                          <p className="text-2xl font-black text-gray-900">{data.sent}</p>
                          <p className="text-xs text-red-500 mt-1 font-medium">{data.failed} fallidos</p>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                          <div className="flex items-center gap-2 text-blue-800 mb-2">
                            <Eye className="w-4 h-4"/> <span className="font-semibold text-sm">Leídos</span>
                          </div>
                          <p className="text-2xl font-black text-blue-900">{data.opened}</p>
                          <p className="text-xs text-blue-600 mt-1 font-medium">{openRate}% Tasa de Apertura</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                          <div className="flex items-center gap-2 text-green-800 mb-2">
                            <ShoppingCart className="w-4 h-4"/> <span className="font-semibold text-sm">Ventas (Conv.)</span>
                          </div>
                          <p className="text-2xl font-black text-green-900">{data.conversions}</p>
                          <p className="text-xs text-green-600 mt-1 font-medium">{conversionRate}% Tasa de Cierre</p>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                          <div className="flex items-center gap-2 text-purple-800 mb-2">
                            <DollarSign className="w-4 h-4"/> <span className="font-semibold text-sm">Retorno Bruto</span>
                          </div>
                          <p className="text-2xl font-black text-purple-900">${data.revenue.toLocaleString()}</p>
                          <p className="text-xs text-purple-600 mt-1 font-medium">Inversión: ${cost.toFixed(2)} USD</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
