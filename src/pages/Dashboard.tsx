import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Activity, Filter, ChevronDown, MessageSquare, MessageCircle, Loader2, Send, Truck, ShieldAlert } from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../lib/auth';
import { fetchDashboardData, processRemarketingFunnels, processSalesWaFunnels, processRemarketingWaFunnels, processLogisticsFunnels, processSocialFunnels, processAIMetrics, processAdvancedInsights } from '../lib/dashboard-data';
import { supabase } from '../lib/supabase';
import { AdvancedInsights } from '../components/dashboard/AdvancedInsights';

type TabType = 'whatsapp' | 'carts' | 'remarketing' | 'broadcast' | 'logistics' | 'social';

export function Dashboard() {
  const { user } = useAuth();
  const storeIds = (user as any)?.storeIds || (user as any)?.storeAccess?.map((a: any) => a.storeId) || [];
  const [activeTab, setActiveTab] = useState<TabType>('whatsapp');
  
  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [country, setCountry] = useState('all');
  const [storeId, setStoreId] = useState('all');
  
  // Data state
  const [leads, setLeads] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch stores for dropdown
  useEffect(() => {
    async function loadStores() {
      if (!storeIds || storeIds.length === 0) return;
      const { data } = await supabase.from('stores').select('id, name, country').in('id', storeIds);
      setStores(data || []);
    }
    loadStores();
  }, [storeIds]);

  // Fetch leads based on filters
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await fetchDashboardData({ startDate, endDate, country, storeId }, storeIds);
      setLeads(data);
      setLoading(false);
    }
    loadData();
  }, [startDate, endDate, country, storeId, storeIds]);

  // Process data for the active tab
  let currentData: any = { kpis: [], funnel: [], title: '', revenue: 0 };
  
  if (activeTab === 'whatsapp') {
    const p = processSalesWaFunnels(leads);
    currentData = {
      title: "Ventas WhatsApp (Inbound)",
      revenue: p.kpis.revenue,
      kpis: [
        { label: "Leads Entrantes", value: p.kpis.incoming.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Interacción IA", value: p.kpis.interaction.toString(), icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Datos Recolectados", value: p.kpis.dataCollected.toString(), icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Pedidos Confirmados", value: p.kpis.confirmed.toString(), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
      ],
      funnel: p.funnel
    };
  } else if (activeTab === 'carts') {
    const p = processRemarketingFunnels(leads);
    currentData = {
      title: "Carritos Abandonados (Recuperación)",
      revenue: p.kpis.revenue,
      kpis: [
        { label: "Carritos Detectados", value: p.kpis.detected.toString(), icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Plantillas Enviadas", value: p.kpis.sentTemplates.toString(), icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Respuestas al Bot", value: p.kpis.replies.toString(), icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Carritos Recuperados", value: p.kpis.recovered.toString(), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
      ],
      funnel: p.funnel
    };
  } else if (activeTab === 'remarketing') {
    const p = processRemarketingWaFunnels(leads);
    currentData = {
      title: "Remarketing Activo (Outbound WhatsApp)",
      revenue: p.kpis.revenue,
      kpis: [
        { label: "Base de Leads", value: p.kpis.total.toString(), icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Contactados", value: p.kpis.contacted.toString(), icon: Send, color: "text-orange-600", bg: "bg-orange-50" },
        { label: "Enganchados", value: p.kpis.engaged.toString(), icon: Activity, color: "text-red-600", bg: "bg-red-50" },
        { label: "Convertidos", value: p.kpis.converted.toString(), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
      ],
      funnel: p.funnel
    };
  } else if (activeTab === 'broadcast') {
    // Difusión Masiva - por ahora usa los mismos datos de remarketing_wa
    const p = processRemarketingWaFunnels(leads);
    currentData = {
      title: "Difusión Masiva (Campañas)",
      revenue: p.kpis.revenue,
      kpis: [
        { label: "Mensajes Enviados", value: p.kpis.total.toString(), icon: Send, color: "text-cyan-600", bg: "bg-cyan-50" },
        { label: "Entregados", value: p.kpis.contacted.toString(), icon: MessageSquare, color: "text-teal-600", bg: "bg-teal-50" },
        { label: "Respuestas", value: p.kpis.engaged.toString(), icon: Users, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Conversiones", value: p.kpis.converted.toString(), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
      ],
      funnel: p.funnel
    };
  } else if (activeTab === 'logistics') {
    const p = processLogisticsFunnels(leads);
    currentData = {
      title: "Confirmación de Pedidos (Logística)",
      revenue: p.kpis.revenue,
      kpis: [
        { label: "Pedidos Recibidos", value: p.kpis.total.toString(), icon: Truck, color: "text-violet-600", bg: "bg-violet-50" },
        { label: "Contactados", value: p.kpis.contacted.toString(), icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Dirección Verificada", value: p.kpis.addressVerified.toString(), icon: Activity, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "Confirmados", value: p.kpis.confirmed.toString(), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
      ],
      funnel: p.funnel
    };
  } else if (activeTab === 'social') {
    const p = processSocialFunnels(leads);
    currentData = {
      title: "Redes Sociales (Instagram, Facebook, TikTok)",
      revenue: p.kpis.revenue,
      kpis: [
        { label: "Comentarios Públicos", value: p.kpis.total.toString(), icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "DM Enviados", value: p.kpis.engaged.toString(), icon: MessageCircle, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Moderados / Eliminados", value: (p.kpis as any).moderated?.toString() || '0', icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
        { label: "Ventas / Derivados", value: p.kpis.converted.toString(), icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
      ],
      funnel: p.funnel
    };
  }

  // AI Metrics - filtrados por tab activo
  const tabFilteredLeads = activeTab === 'whatsapp' ? leads.filter(l => l.board_type === 'sales_wa')
    : activeTab === 'carts' ? leads.filter(l => (l.board_type || '').includes('remarketing_cart'))
    : activeTab === 'remarketing' ? leads.filter(l => l.board_type === 'remarketing' || l.board_type === 'remarketing_wa')
    : activeTab === 'logistics' ? leads.filter(l => l.board_type === 'logistics')
    : activeTab === 'social' ? leads.filter(l => l.board_type === 'social_media' || l.board_type === 'sales_social')
    : leads;
  const aiMetrics = processAIMetrics(tabFilteredLeads);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Advanced Filters */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analítica Avanzada: Embudos</h1>
          <p className="text-sm text-gray-500 mt-1">Identifica exactamente en qué etapa se están cayendo tus ventas.</p>
        </div>
        
        {/* Advanced Filters Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 font-bold text-gray-700 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-blue-600" /> Filtros Globales
          </div>
          
          <div className="flex-1 min-w-[320px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rango de Fechas</label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 focus:ring-1 focus:ring-blue-500 bg-gray-50/50" title="Desde" />
              </div>
              <span className="text-xs font-bold text-gray-400">a</span>
              <div className="relative flex-1">
                <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 focus:ring-1 focus:ring-blue-500 bg-gray-50/50" title="Hasta" />
              </div>
            </div>
            {/* Quick Date Filters */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(() => {
                // Helper: fecha local YYYY-MM-DD (sin UTC offset)
                const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                const today = new Date();
                const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
                return [
                  { label: 'Hoy', fn: () => { const t = localDate(today); setStartDate(t); setEndDate(t); } },
                  { label: 'Ayer', fn: () => { const y = localDate(daysAgo(1)); setStartDate(y); setEndDate(y); } },
                  { label: '7 días', fn: () => { setStartDate(localDate(daysAgo(7))); setEndDate(localDate(today)); } },
                  { label: '30 días', fn: () => { setStartDate(localDate(daysAgo(30))); setEndDate(localDate(today)); } },
                  { label: 'Este mes', fn: () => { setStartDate(localDate(new Date(today.getFullYear(), today.getMonth(), 1))); setEndDate(localDate(today)); } },
                  { label: 'Todo', fn: () => { setStartDate(''); setEndDate(''); } }
                ].map(q => (
                  <button key={q.label} onClick={q.fn} className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors">
                    {q.label}
                  </button>
                ));
              })()}
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">País</label>
            <div className="relative">
              <select value={country} onChange={e => setCountry(e.target.value)} className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50">
                <option value="all">Global (Todos)</option>
                {Array.from(new Set(stores.map(s => s.country).filter(Boolean))).sort().map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tienda</label>
            <div className="relative">
              <select value={storeId} onChange={e => setStoreId(e.target.value)} className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50">
                <option value="all">Todas las Tiendas</option>
                {[...stores].sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex space-x-2 border-b border-gray-200 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'whatsapp' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          1. Ventas WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('carts')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'carts' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          2. Carritos Abandonados
        </button>
        <button
          onClick={() => setActiveTab('remarketing')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'remarketing' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          3. Remarketing (Activo)
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'broadcast' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          4. Difusión Masiva
        </button>
        <button
          onClick={() => setActiveTab('logistics')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'logistics' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          5. Confirmación de Pedidos
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'social' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          6. Redes Sociales
        </button>
      </div>

      {/* Dynamic Title */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">{currentData.title}</h2>

      {/* Dynamic Top KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {currentData.kpis.map((kpi: any, index: number) => (
          <div key={index} className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <h3 className="text-sm font-medium text-gray-500">{kpi.label}</h3>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
              <span className={`text-sm font-medium ${index === 0 ? 'text-blue-600' : 'text-gray-500'} flex items-center gap-1`}>
                {index === 0 && <TrendingUp className="h-3 w-3" />} {kpi.trend}
              </span>
            </div>
            {/* Visual Progress Bar in KPI */}
            {index > 0 && (
               <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${kpi.color.replace('text-', 'bg-')}`} style={{ width: '100%' }}></div>
               </div>
            )}
          </div>
        ))}
      </div>

      {/* Funnel Visualization Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Literal Funnel Chart - Premium Split View */}
        <div className="glass-card rounded-2xl p-8 lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              Embudo Geométrico (Drop-off Visual)
              {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
            </h3>
          </div>
          
          <div className="relative w-full h-[600px] flex">
            
            {/* Left Side: Literal SVG Funnel */}
            <div className="w-[50%] h-full relative">
              <svg viewBox="0 0 500 600" className="w-full h-full drop-shadow-md" preserveAspectRatio="none">
                {currentData.funnel.map((stage: any, i: number) => {
                  // Calculate widths relative to 500px canvas
                  const calculateWidth = (percent: number) => Math.max(percent * 5, 80); // Base width 80px
                  
                  const topWidth = calculateWidth(stage.percentage);
                  const bottomWidth = i < currentData.funnel.length - 1 
                    ? calculateWidth(currentData.funnel[i+1].percentage) 
                    : topWidth * 0.6; 
                  
                  const topLeftX = 250 - topWidth / 2;
                  const topRightX = 250 + topWidth / 2;
                  const bottomLeftX = 250 - bottomWidth / 2;
                  const bottomRightX = 250 + bottomWidth / 2;
                  
                  // Height is 150 per stage
                  const topY = i * 150;
                  const bottomY = (i + 1) * 150 - 4; // Gap
                  
                  const points = `${topLeftX},${topY} ${topRightX},${topY} ${bottomRightX},${bottomY} ${bottomLeftX},${bottomY}`;
                  
                  return (
                    <polygon 
                      key={i}
                      points={points} 
                      fill={stage.colorHex} 
                      opacity="0.95"
                      className="transition-all duration-700 ease-in-out hover:opacity-100 hover:brightness-110 cursor-pointer"
                      strokeWidth="0"
                    />
                  );
                })}
              </svg>

              {/* Labels inside the funnel */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                {currentData.funnel.map((stage: any, i: number) => (
                  <div key={i} className="h-[150px] flex flex-col items-center justify-center">
                    <span className="text-gray-900 font-bold text-sm md:text-base drop-shadow-md text-center">{stage.stage}</span>
                    <span className="text-gray-900 font-black text-xl md:text-3xl drop-shadow-md tracking-tight">
                      {stage.count} <span className="text-gray-800 text-xs md:text-sm font-semibold opacity-80">({stage.percentage}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side: Analysis Cards with Connectors */}
            <div className="w-[50%] h-full relative pointer-events-none">
              {currentData.funnel.map((stage: any, i: number) => {
                if (i === 0) return null; // No dropoff for first stage
                
                const prevStage = currentData.funnel[i-1];
                const dropPercent = prevStage.count > 0 ? Math.round(((prevStage.count - stage.count) / prevStage.count) * 100) : 0;
                const dropCount = prevStage.count - stage.count;

                if (dropPercent <= 0) return null;

                // Position the card perfectly at the seam between the two stages
                const topPosition = i * 150 - 45; 

                return (
                  <div 
                    key={i} 
                    className="absolute w-full flex items-center pr-4" 
                    style={{ top: `${topPosition}px` }}
                  >
                    {/* SVG Curve Connector */}
                    <svg className="w-16 h-12 flex-shrink-0 -ml-4" viewBox="0 0 50 50">
                       <path d="M 0,0 Q 25,0 25,25 T 50,25" fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4" opacity="0.6"/>
                    </svg>
                    
                    {/* Premium Drop-off Card */}
                    <div className="flex-1 bg-white/80 backdrop-blur-md px-5 py-4 rounded-2xl border border-red-100 shadow-xl pointer-events-auto hover:border-red-300 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-red-100 p-1.5 rounded-lg flex-shrink-0">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <h5 className="text-red-700 font-black text-sm">Fuga del {dropPercent}%</h5>
                          <p className="text-xs font-bold text-red-500/80 -mt-1">-{dropCount} usuarios</p>
                        </div>
                      </div>
                      {stage.dropoffAnalysis && (
                        <p className="text-xs text-gray-600 font-medium leading-relaxed mt-2 border-t border-red-50 pt-2">
                          <strong className="text-red-800/80">{stage.dropoffAnalysis.split(':')[0]}:</strong> 
                          {stage.dropoffAnalysis.substring(stage.dropoffAnalysis.indexOf(':') + 1)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Effectiveness Donut Chart + Revenue */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-gray-900 w-full text-left mb-2">Cierres 100% IA</h3>
          <p className="text-xs text-gray-500 w-full text-left mb-4">{aiMetrics.totalClosed} pedidos cerrados</p>
          
          {aiMetrics.totalClosed > 0 ? (
            <>
              <div className="relative w-44 h-44">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="15" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="15" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (251.2 * aiMetrics.aiPercent / 100)} 
                    className="transition-all duration-1000 ease-out" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="15" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (251.2 * aiMetrics.humanPercent / 100)} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-900">{aiMetrics.aiPercent}%</span>
                  <span className="text-xs text-gray-500 text-center px-4">Efectividad IA</span>
                </div>
              </div>
              <div className="mt-6 w-full space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Cerrado por Bot</span>
                  <span className="font-semibold text-gray-900">{aiMetrics.aiPercent}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Intervención Humana</span>
                  <span className="font-semibold text-gray-900">{aiMetrics.humanPercent}%</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm py-12">
              Aún no hay pedidos cerrados para analizar
            </div>
          )}
          
          {/* Revenue Card */}
          <div className="mt-6 w-full p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs font-bold text-green-700 uppercase">Ingresos del Tab</span>
            </div>
            <span className="text-2xl font-black text-green-800">
              ${(currentData.revenue || 0).toLocaleString('es-CO')}
            </span>
            <span className="text-xs text-green-600 ml-1">COP</span>
          </div>
        </div>
      </div>

      {/* Advanced Insights Module (Joyas Ocultas) */}
      <AdvancedInsights insightsData={processAdvancedInsights(leads)} leads={leads} />

    </div>
  );
}
