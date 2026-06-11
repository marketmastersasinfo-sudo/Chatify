import { useState } from 'react';
import { Calendar as CalendarIcon, TrendingUp, Users, ShoppingCart, DollarSign, Activity, Filter, ChevronDown, MessageSquare, Target } from 'lucide-react';
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
      { stage: "1. Leads Entrantes", count: 3010, percentage: 100, color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Interacción IA", count: 1850, percentage: 61.4, color: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50" },
      { stage: "3. Datos Recolectados", count: 845, percentage: 28.0, color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
      { stage: "4. Pedidos Confirmados", count: 380, percentage: 12.6, color: "bg-green-500", text: "text-green-700", bg: "bg-green-50" }
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
      { stage: "1. Carritos Detectados", count: 1200, percentage: 100, color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Plantillas Enviadas", count: 1150, percentage: 95.8, color: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50" },
      { stage: "3. Respuestas al Bot", count: 450, percentage: 37.5, color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
      { stage: "4. Carritos Recuperados", count: 120, percentage: 10.0, color: "bg-green-500", text: "text-green-700", bg: "bg-green-50" }
    ]
  },
  remarketing: {
    title: "Remarketing (Difusión Masiva)",
    kpis: [
      { label: "Mensajes Lanzados", value: "5,000", trend: "Ráfagas", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "Mensajes Leídos", value: "4,200", trend: "84% Open", icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Clics / Respuestas", value: "850", trend: "20% Click", icon: Target, color: "text-purple-600", bg: "bg-purple-50" },
      { label: "Ventas Generadas", value: "95", trend: "11% Cierre", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" }
    ],
    funnel: [
      { stage: "1. Mensajes Lanzados", count: 5000, percentage: 100, color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Mensajes Leídos", count: 4200, percentage: 84.0, color: "bg-indigo-500", text: "text-indigo-700", bg: "bg-indigo-50" },
      { stage: "3. Clics / Respuestas", count: 850, percentage: 17.0, color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50" },
      { stage: "4. Ventas Generadas", count: 95, percentage: 1.9, color: "bg-green-500", text: "text-green-700", bg: "bg-green-50" }
    ]
  }
};

type TabType = 'whatsapp' | 'carts' | 'remarketing';

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
      <div className="flex space-x-2 border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors",
            activeTab === 'whatsapp' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Ventas WhatsApp
        </button>
        <button
          onClick={() => setActiveTab('carts')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors",
            activeTab === 'carts' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Carritos Abandonados
        </button>
        <button
          onClick={() => setActiveTab('remarketing')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors",
            activeTab === 'remarketing' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          Remarketing / Difusión
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
        
        {/* Horizontal Funnel Chart */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Análisis de Retención (Caída por Etapas)</h3>
          </div>
          
          <div className="space-y-6">
            {currentData.funnel.map((stage, i) => {
              // Calculate drop from previous stage
              const prevStage = i > 0 ? currentData.funnel[i-1] : null;
              const dropPercent = prevStage ? Math.round(((prevStage.count - stage.count) / prevStage.count) * 100) : 0;

              return (
                <div key={i} className="relative">
                  <div className="flex justify-between items-end mb-1">
                    <span className={`text-sm font-bold ${stage.text}`}>{stage.stage}</span>
                    <span className="text-sm font-bold text-gray-900">{stage.count} <span className="text-gray-400 font-normal text-xs">({stage.percentage}%)</span></span>
                  </div>
                  
                  {/* Bar */}
                  <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden relative group">
                    <div 
                      className={`h-full ${stage.color} rounded-full flex items-center justify-end pr-3 transition-all duration-1000 ease-out`}
                      style={{ width: `${stage.percentage}%` }}
                    >
                      {stage.percentage > 15 && (
                        <span className="text-white text-xs font-bold">{stage.percentage}% retenido</span>
                      )}
                    </div>
                  </div>

                  {/* Drop-off warning arrow */}
                  {i < currentData.funnel.length - 1 && (
                    <div className="absolute -bottom-5 left-8 flex items-center gap-1 text-[10px] font-bold text-red-500">
                      <TrendingUp className="w-3 h-3 rotate-180" /> 
                      Se cayó el {dropPercent}% aquí
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Effectiveness Donut Chart */}
        <div className="glass-card rounded-2xl p-6 flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-gray-900 w-full text-left mb-6">Tasa de Efectividad IA</h3>
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="15" />
              {/* Progress circle */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="36.8" className="transition-all duration-1000 ease-out" />
              {/* Third layer (human intervention) */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="214.4" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">85%</span>
              <span className="text-xs text-gray-500 text-center px-4">Cierres 100% IA</span>
            </div>
          </div>
          <div className="mt-8 w-full space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Cerrado por Bot</span>
              <span className="font-semibold text-gray-900">85.3%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Cierre Humano</span>
              <span className="font-semibold text-gray-900">14.7%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
