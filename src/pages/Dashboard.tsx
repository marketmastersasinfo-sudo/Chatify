import { useState } from 'react';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Activity, Filter, ChevronDown, MessageSquare, Target } from 'lucide-react';
import { cn } from '../utils/cn';

const funnels = {
  whatsapp: {
    title: "Ventas WhatsApp (Inbound)",
    kpis: [
      { label: "Leads Entrantes", value: "3,010", trend: "+12%", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "Interacción IA", value: "1,850", trend: "61% Conv", icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Datos Recolectados", value: "845", trend: "45% Conv", icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-50" },
      { label: "Pedidos Confirmados", value: "380", trend: "45% Cierre", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
    ],
    funnel: [
      { stage: "1. Leads Entrantes", count: 3010, percentage: 100, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Interacción IA", count: 1850, percentage: 61.4, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Fricción Inicial: El cliente hizo clic en el anuncio pero ignoró el saludo de la IA. Revisa si el gancho del anuncio es engañoso o si el primer mensaje de la IA es muy largo." },
      { stage: "3. Datos Recolectados", count: 845, percentage: 28.0, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Fricción de Datos: Hubo conversación, pero la persona no quiso dar su dirección. Posible falta de confianza. Ofrece pago contra entrega explícitamente." },
      { stage: "4. Pedidos Confirmados", count: 380, percentage: 12.6, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Fricción de Cierre: Llegaron al final pero no confirmaron el pedido. Analiza si el costo de envío mató la venta o si hay una objeción de precio no resuelta." }
    ]
  },
  carts: {
    title: "Carritos Abandonados (Recuperación)",
    kpis: [
      { label: "Carritos Detectados", value: "1,200", trend: "+5%", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "Plantillas Enviadas", value: "1,150", trend: "95% Envío", icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Respuestas al Bot", value: "450", trend: "39% Conv", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
      { label: "Carritos Recuperados", value: "120", trend: "26% Cierre", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
    ],
    funnel: [
      { stage: "1. Carritos Detectados", count: 1200, percentage: 100, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Plantillas Enviadas", count: 1150, percentage: 95.8, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Fallos de Envío: El número de teléfono dejado en el checkout es inválido o no tiene WhatsApp." },
      { stage: "3. Respuestas al Bot", count: 450, percentage: 37.5, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Ignorados: El mensaje llegó pero no les interesó. Intenta ofrecer un cupón de descuento o un gancho más agresivo en el primer mensaje." },
      { stage: "4. Carritos Recuperados", count: 120, percentage: 10.0, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Objeción Final: Respondieron al bot pero no terminaron comprando. Es vital que un humano lea estas conversaciones para ajustar el entrenamiento de la IA." }
    ]
  },
  remarketing: {
    title: "Remarketing (Seguimiento a Prospectos)",
    kpis: [
      { label: "Prospectos Calientes", value: "850", trend: "-", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "Mensajes Enviados", value: "800", trend: "94% Alcance", icon: MessageSquare, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Respuestas Recibidas", value: "320", trend: "40% Click", icon: Activity, color: "text-purple-600", bg: "bg-purple-50" },
      { label: "Ventas Remarketing", value: "65", trend: "20% Cierre", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
    ],
    funnel: [
      { stage: "1. Prospectos Calientes", count: 850, percentage: 100, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Mensajes Enviados", count: 800, percentage: 94.1, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Pérdida de Contacto: Algunos números fueron bloqueados o ya no existen." },
      { stage: "3. Respuestas Recibidas", count: 320, percentage: 37.6, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Falta de Interés: La oferta de Remarketing no es lo suficientemente atractiva comparada con el precio original." },
      { stage: "4. Ventas Remarketing", count: 65, percentage: 7.6, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Fricción de Pago: Respondieron pero no concretaron. Quizás el proceso de pago manual es muy engorroso." }
    ]
  },
  broadcast: {
    title: "Difusión Masiva (Ráfagas)",
    kpis: [
      { label: "Mensajes Lanzados", value: "15,000", trend: "Ráfagas", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "Mensajes Leídos", value: "12,200", trend: "81% Open", icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Clics / Respuestas", value: "1,850", trend: "15% Click", icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
      { label: "Re-compras", value: "210", trend: "11% Cierre", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
    ],
    funnel: [
      { stage: "1. Mensajes Lanzados", count: 15000, percentage: 100, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Mensajes Leídos", count: 12200, percentage: 81.3, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Ignorados: Muchos no abrieron el mensaje. Asegúrate de enviar mensajes en horarios pico (7pm - 9pm)." },
      { stage: "3. Clics / Respuestas", count: 1850, percentage: 12.3, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Bajo Engagement: Leyeron pero no hicieron clic. Falta urgencia (Ej: 'Solo por 24 horas') o un Call to Action claro." },
      { stage: "4. Re-compras", count: 210, percentage: 1.4, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Abandono Web: Hicieron clic pero la página cargó lento o el producto estaba agotado. Revisa la landing page." }
    ]
  }
};

type TabType = 'whatsapp' | 'carts' | 'remarketing' | 'broadcast';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('whatsapp');
  const currentData = funnels[activeTab];

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
                <input type="date" className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 focus:ring-1 focus:ring-blue-500 bg-gray-50/50" title="Desde" />
              </div>
              <span className="text-xs font-bold text-gray-400">a</span>
              <div className="relative flex-1">
                <CalendarIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="date" className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 focus:ring-1 focus:ring-blue-500 bg-gray-50/50" title="Hasta" />
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">País</label>
            <div className="relative">
              <select className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50">
                <option value="all">Global (Todos)</option>
                <option value="CO">Colombia</option>
                <option value="MX">México</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tienda</label>
            <div className="relative">
              <select className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50">
                <option value="all">Todas las Tiendas</option>
                <option value="dropi_co">Dropi Colombia</option>
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
      </div>

      {/* Dynamic Title */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">{currentData.title}</h2>

      {/* Dynamic Top KPIs */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {currentData.kpis.map((kpi, index) => (
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
                  <div className={`h-1.5 rounded-full ${kpi.color.replace('text-', 'bg-')}`} style={{ width: kpi.trend.split('%')[0] + '%' }}></div>
               </div>
            )}
          </div>
        ))}
      </div>

      {/* Funnel Visualization Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Premium Vertical Funnel Flow */}
        <div className="glass-card rounded-2xl p-8 lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Pipeline de Conversión</h3>
              <p className="text-sm text-gray-500">Análisis detallado de retención y puntos de fricción.</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center w-full relative">
            {currentData.funnel.map((stage, i) => {
              const prevStage = i > 0 ? currentData.funnel[i-1] : null;
              const dropPercent = prevStage ? Math.round(((prevStage.count - stage.count) / prevStage.count) * 100) : 0;
              const dropCount = prevStage ? prevStage.count - stage.count : 0;

              return (
                <div key={i} className="w-full flex flex-col items-center">
                  
                  {/* Stage Card */}
                  <div className="w-full max-w-[500px] bg-white rounded-2xl border border-gray-200 shadow-sm p-5 relative overflow-hidden group hover:border-blue-300 transition-colors z-10">
                    {/* Background Progress Fill */}
                    <div 
                      className={`absolute left-0 top-0 bottom-0 ${stage.bg} opacity-50 transition-all duration-1000`}
                      style={{ width: `${stage.percentage}%` }}
                    />
                    
                    <div className="relative flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${stage.bg} ${stage.color}`}>
                          {i + 1}
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-900">{stage.stage.replace(/^\d+\.\s*/, '')}</h4>
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Top: {stage.percentage}%
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-gray-900">{stage.count.toLocaleString()}</span>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Usuarios</p>
                      </div>
                    </div>
                  </div>

                  {/* Connecting Line & Drop-off Analysis */}
                  {i < currentData.funnel.length - 1 && (
                    <div className="flex w-full max-w-[500px] min-h-[80px] relative">
                      {/* Vertical Spine */}
                      <div className="absolute left-[40px] top-0 bottom-0 border-l-2 border-dashed border-gray-300 z-0"></div>
                      
                      {/* Horizontal Branch to Drop-off */}
                      <div className="absolute left-[40px] top-1/2 w-[30px] border-t-2 border-dashed border-red-300 z-0"></div>
                      
                      {/* Drop-off Card */}
                      <div className="ml-[80px] my-4 w-full bg-gradient-to-r from-red-50 to-white rounded-xl p-4 border border-red-100 shadow-sm relative z-10">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className="bg-red-100 p-1 rounded-md">
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            </div>
                            <span className="text-red-700 font-bold text-sm">Fuga del {dropPercent}%</span>
                          </div>
                          <span className="text-xs font-bold text-red-500 bg-red-100/50 px-2 py-0.5 rounded-md border border-red-200">
                            -{dropCount.toLocaleString()} perdidos
                          </span>
                        </div>
                        {stage.dropoffAnalysis && (
                          <p className="text-xs text-red-600/90 leading-relaxed font-medium">
                            {stage.dropoffAnalysis}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Effectiveness Donut Chart */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-gray-900 w-full text-left mb-6">Cierres 100% IA</h3>
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="15" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="36.8" className="transition-all duration-1000 ease-out" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="214.4" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">85%</span>
              <span className="text-xs text-gray-500 text-center px-4">Efectividad IA</span>
            </div>
          </div>
          <div className="mt-8 w-full space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Cerrado por Bot</span>
              <span className="font-semibold text-gray-900">85.3%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Intervención Humana</span>
              <span className="font-semibold text-gray-900">14.7%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
