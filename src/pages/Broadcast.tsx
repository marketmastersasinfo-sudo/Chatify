import { useState, useEffect } from 'react';
import { Megaphone, Users, Filter, FileText, Send, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';

export function Broadcast() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  
  // Data States
  const [stores, setStores] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  
  // Filter States
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadStores();
  }, [user]);

  useEffect(() => {
    if (selectedStoreId) {
      calculateAudience();
      loadTemplates();
    } else {
      setAudienceCount(0);
      setTemplates([]);
    }
  }, [selectedStoreId, tag, dateFrom, dateTo, geography, ltv, paymentStatus]);

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

  async function loadTemplates() {
    try {
      const { data } = await supabase.from('store_templates')
        .select('*')
        .eq('store_id', selectedStoreId)
        .eq('category', 'MARKETING')
        .eq('status', 'APPROVED');
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplateId((data as any[])[0].id);
      }
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

      let finalLeads = data || [];
      if (ltv !== 'all') {
        const minAmount = parseInt(ltv);
        finalLeads = (finalLeads as any[]).filter(l => (l.total_price || 0) >= minAmount);
      }
      setAudienceCount(finalLeads.length);
    } catch (err) {
      console.error(err);
      setAudienceCount(0);
    }
    setIsCalculating(false);
  }

  async function handleLaunch() {
    setIsLaunching(true);
    setLaunchError(null);
    setLaunchMessage(null);
    try {
      const payload = {
        storeId: selectedStoreId,
        templateId: selectedTemplateId,
        tags: tag,
        dateFrom,
        dateTo,
        geography,
        ltv,
        paymentStatus
      };
      
      const res = await fetch('/api/broadcast-launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al lanzar');
      
      setLaunchMessage(json.message);
      // Opcional: regresar al step 1 o mostrar success
    } catch (err: any) {
      setLaunchError(err.message);
    }
    setIsLaunching(false);
  }

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-indigo-600" /> Difusión Masiva (Ráfagas)
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Envía promociones y avisos masivos a tu base de datos cumpliendo las políticas de Meta.
        </p>
      </div>

      {/* Stepper Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-3 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-indigo-100' : 'bg-gray-100'}`}>1</div>
            <span className="font-bold text-sm">Audiencia</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-100'}`}></div>
          <div className={`flex items-center gap-3 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-indigo-100' : 'bg-gray-100'}`}>2</div>
            <span className="font-bold text-sm">Plantilla A/B</span>
          </div>
          <div className={`flex-1 h-1 mx-4 rounded ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-100'}`}></div>
          <div className={`flex items-center gap-3 ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-indigo-100' : 'bg-gray-100'}`}>3</div>
            <span className="font-bold text-sm">Lanzamiento</span>
          </div>
        </div>
      </div>

      {/* Step 1: Audiencia */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Filter className="w-5 h-5 text-indigo-600"/> 1. Segmentar Audiencia</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tienda de Origen</label>
                <select value={selectedStoreId} onChange={e => setSelectedStoreId(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Etiqueta de Cliente</label>
                <select value={tag} onChange={e => setTag(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="all">Todos los contactos</option>
                  <option value="vip">Clientes VIP (Compras)</option>
                  <option value="abandoned">Carritos Abandonados</option>
                  <option value="cold_lead">Leads Fríos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Última Compra (Desde)</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Última Compra (Hasta)</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 text-gray-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ubicación (Geografía)</label>
                <select value={geography} onChange={e => setGeography(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="all">Todo el país</option>
                  <option value="principal">Solo ciudades principales</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Monto Gastado (LTV)</label>
                <select value={ltv} onChange={e => setLtv(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="all">Cualquier monto</option>
                  <option value="50000">Más de $50.000 COP</option>
                  <option value="150000">Más de $150.000 COP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Estado de Pago Histórico</label>
                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                  <option value="all">Cualquier estado</option>
                  <option value="paid">Pagados y Entregados</option>
                  <option value="delivered">Solo Entregados</option>
                </select>
              </div>
            </div>

            <div className="mt-8 bg-indigo-50 p-4 rounded-xl flex items-center justify-between border border-indigo-100">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-lg shadow-sm">
                  {isCalculating ? <Loader2 className="w-6 h-6 text-indigo-600 animate-spin"/> : <Users className="w-6 h-6 text-indigo-600"/>}
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-900">Audiencia Calculada</p>
                  <p className="text-2xl font-bold text-indigo-700">{audienceCount} <span className="text-sm font-normal">Contactos viables</span></p>
                </div>
              </div>
              <button 
                onClick={() => setStep(2)} 
                disabled={audienceCount === 0}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-soft"
              >
                Continuar a Plantilla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Plantilla */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> 2. Elegir Plantilla Aprobada</h2>
              <button onClick={() => setStep(1)} className="text-sm font-semibold text-gray-500 hover:text-gray-700">Volver Atrás</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No tienes plantillas de MARKETING aprobadas en esta tienda. Crea una en la sección de Plantillas.
                </div>
              ) : (
                templates.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={`border-2 rounded-xl p-4 cursor-pointer relative transition-colors ${selectedTemplateId === t.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    {selectedTemplateId === t.id && (
                      <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase">Seleccionada</div>
                    )}
                    <h4 className="font-bold text-gray-900 mb-2">{t.template_name}</h4>
                    <div className="bg-white p-3 rounded-lg text-sm text-gray-700 border border-gray-200 overflow-hidden line-clamp-3">
                      {t.meta_payload?.components?.find((c:any) => c.type === 'BODY')?.text || 'Sin texto'}
                    </div>
                    <div className="mt-3 text-xs font-semibold text-gray-500 flex justify-between">
                      <span>Categoría: {t.category}</span>
                      <span className="text-green-600">Aprobada por Meta</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button 
                onClick={() => setStep(3)} 
                disabled={!selectedTemplateId}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-soft"
              >
                Continuar a Lanzamiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Lanzamiento */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Send className="w-5 h-5 text-indigo-600"/> 3. Confirmación y Lanzamiento</h2>
              <button onClick={() => setStep(2)} className="text-sm font-semibold text-gray-500 hover:text-gray-700">Volver Atrás</button>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-6">
              <h3 className="font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Resumen de la Campaña</h3>
              <ul className="space-y-3">
                <li className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Audiencia Objetivo:</span>
                  <span className="text-sm font-bold text-gray-900">{audienceCount} Contactos viables</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Plantilla Seleccionada:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedTemplate?.template_name || 'Ninguna'}</span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 font-medium">Costo Estimado (Meta):</span>
                  <span className="text-sm font-bold text-red-600">~ ${(audienceCount * 0.05).toFixed(2)} USD</span>
                </li>
              </ul>
            </div>

            <div className="flex items-start gap-3 bg-orange-50 p-4 rounded-xl border border-orange-100 mb-8">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800 font-medium">
                Al hacer clic en lanzar, los mensajes se enviarán en lotes de 50 por minuto para evitar baneos de WhatsApp por SPAM. El proceso tomará aproximadamente {Math.ceil(audienceCount / 50)} minutos en completarse.
              </p>
            </div>

            {launchMessage && (
              <div className="mb-4 p-4 bg-green-50 text-green-800 border border-green-200 rounded-lg">
                ✅ {launchMessage}
              </div>
            )}

            {launchError && (
              <div className="mb-4 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg">
                ❌ {launchError}
              </div>
            )}

            <div className="flex justify-end gap-4">
              <button 
                onClick={handleLaunch}
                disabled={isLaunching || audienceCount === 0 || !!launchMessage}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-soft flex items-center gap-2"
              >
                {isLaunching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
                {isLaunching ? 'Lanzando...' : 'Lanzar Ráfaga Ahora'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
