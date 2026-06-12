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
  },
  logistics: {
    title: "Confirmación de Pedidos (Logística)",
    kpis: [
      { label: "Nuevos Pedidos", value: "850", trend: "+5%", icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50" },
      { label: "Confirmados", value: "720", trend: "84% Conv", icon: Target, color: "text-green-600", bg: "bg-green-50" },
      { label: "Despachados", value: "690", trend: "95% Envío", icon: Activity, color: "text-indigo-600", bg: "bg-indigo-50" },
      { label: "Cancelados", value: "30", trend: "4% Fuga", icon: Target, color: "text-red-600", bg: "bg-red-50" }
    ],
    funnel: [
      { stage: "1. Nuevos Pedidos", count: 850, percentage: 100, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Solicitud Enviada", count: 820, percentage: 96.4, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Falla de Contacto: El número de WhatsApp no existe o bloqueó al bot." },
      { stage: "3. Confirmados 100%", count: 720, percentage: 84.7, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Dudas sin Resolver: El cliente pidió modificar la dirección o se arrepintió antes de despachar." },
      { stage: "4. Despachados", count: 690, percentage: 81.1, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Novedad en Transportadora: Pedido devuelto por zona de difícil acceso o cliente ausente." }
    ]
  }
};

type TabType = 'whatsapp' | 'carts' | 'remarketing' | 'broadcast' | 'logistics';

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
        <button
          onClick={() => setActiveTab('logistics')}
          className={cn(
            "px-6 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
            activeTab === 'logistics' ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          )}
        >
          5. Confirmación de Pedidos
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
        
        {/* SVG Literal Funnel Chart - Premium Split View */}
        <div className="glass-card rounded-2xl p-8 lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-900">Embudo Geométrico (Drop-off Visual)</h3>
          </div>
          
          <div className="relative w-full h-[600px] flex">
            
            {/* Left Side: Literal SVG Funnel */}
            <div className="w-[50%] h-full relative">
              <svg viewBox="0 0 500 600" className="w-full h-full drop-shadow-md" preserveAspectRatio="none">
                {currentData.funnel.map((stage, i) => {
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
                {currentData.funnel.map((stage, i) => (
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
              {currentData.funnel.map((stage, i) => {
                if (i === 0) return null; // No dropoff for first stage
                
                const prevStage = currentData.funnel[i-1];
                const dropPercent = Math.round(((prevStage.count - stage.count) / prevStage.count) * 100);
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
