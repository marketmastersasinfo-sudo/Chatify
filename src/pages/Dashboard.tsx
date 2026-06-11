import { Calendar as CalendarIcon, TrendingUp, Users, ShoppingCart, DollarSign, Activity, Filter, ChevronDown } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Advanced Filters */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard de Embudo (Contra Entrega)</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas en tiempo real de todo el ecosistema.</p>
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
                <option value="AR">Argentina</option>
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
                <option value="belleza_co">Nicho Belleza CO</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Producto</label>
            <div className="relative">
              <select className="w-full pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-gray-50/50">
                <option value="all">Todos los Productos</option>
                <option value="p1">Smartwatch X8</option>
                <option value="p2">Joggers UrbanFit</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Top KPIs (Funnel Metrics) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Nuevos Leads (Chat Iniciado)</h3>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">3,010</p>
            <span className="text-sm font-medium text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +12%
            </span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Activity className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Datos Recolectados (IA)</h3>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">1,850</p>
            <span className="text-sm text-gray-400">61% Conversión</span>
          </div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '61%' }}></div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Pedidos Confirmados</h3>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">845</p>
            <span className="text-sm text-gray-400">45% Conversión</span>
          </div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Ventas (Contra Entrega)</h3>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <p className="text-3xl font-bold text-gray-900">$34,345</p>
            <span className="text-sm font-medium text-green-600 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> +8%
            </span>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Curved Line Chart Placeholder (Main) */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Flujo de Leads vs Confirmados</h3>
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400"></div> Leads</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> Confirmados</div>
            </div>
          </div>
          
          {/* Faking a spline chart with CSS/SVG */}
          <div className="h-64 w-full relative">
            <div className="absolute inset-0 flex items-end">
              {/* Grid lines */}
              <div className="w-full h-full flex flex-col justify-between absolute inset-0">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-t border-gray-100 h-0"></div>
                ))}
              </div>
              
              {/* Fake Spline Gradient SVG */}
              <svg className="w-full h-full absolute inset-0 z-10" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="blueGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="purpleGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,80 Q10,70 20,40 T40,60 T60,20 T80,50 T100,10 L100,100 L0,100 Z" fill="url(#blueGrad)" />
                <path d="M0,80 Q10,70 20,40 T40,60 T60,20 T80,50 T100,10" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" />
                
                <path d="M0,90 Q15,85 25,70 T45,80 T65,50 T85,75 T100,40 L100,100 L0,100 Z" fill="url(#purpleGrad)" />
                <path d="M0,90 Q15,85 25,70 T45,80 T65,50 T85,75 T100,40" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            
            {/* X Axis labels */}
            <div className="absolute -bottom-6 w-full flex justify-between text-xs text-gray-400">
              <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
            </div>
          </div>
        </div>

        {/* Donut Chart Placeholder */}
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
