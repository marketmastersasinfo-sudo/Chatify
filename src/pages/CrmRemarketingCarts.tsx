import { Clock, AlertCircle, FileText, CheckCircle2, XCircle, Search, Filter, ShoppingCart } from 'lucide-react';

export function CrmRemarketingCarts() {
  const columns = [
    {
      id: 'cooling',
      title: 'Enfriados (< 24h)',
      icon: Clock,
      count: 2,
      color: 'border-blue-200 bg-blue-50/30',
      headerColor: 'bg-blue-100 text-blue-800',
      tooltip: 'Plantilla requerida (Iniciado por Empresa).'
    },
    {
      id: 'contact_1',
      title: 'Re-contacto 1 (> 24h)',
      icon: AlertCircle,
      count: 3,
      color: 'border-orange-200 bg-orange-50/30',
      headerColor: 'bg-orange-100 text-orange-800',
      tooltip: 'Plantilla de Meta obligatoria.'
    },
    {
      id: 'contact_2',
      title: 'Re-contacto 2 (Oferta)',
      icon: FileText,
      count: 1,
      color: 'border-purple-200 bg-purple-50/30',
      headerColor: 'bg-purple-100 text-purple-800',
      tooltip: 'Plantilla de Meta obligatoria.'
    },
    {
      id: 'recovered',
      title: 'Recuperados',
      icon: CheckCircle2,
      count: 0,
      color: 'border-green-200 bg-green-50/30',
      headerColor: 'bg-green-100 text-green-800',
      tooltip: 'Saltaron de nuevo a Ventas.'
    },
    {
      id: 'lost',
      title: 'Perdidos Definitivos',
      icon: XCircle,
      count: 0,
      color: 'border-gray-200 bg-gray-50/30',
      headerColor: 'bg-gray-100 text-gray-800',
      tooltip: 'No respondieron tras 48h.'
    }
  ];

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-purple-600" /> CRM Remarketing (Carritos ShopyEasy)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Rescata ventas de la Web. <span className="font-semibold text-orange-600">Regla Meta:</span> Contacto Iniciado por Empresa = Plantilla Obligatoria Siempre.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar cliente..." className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
          </div>
          <button className="p-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 shadow-soft">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80 flex flex-col snap-center">
            {/* Column Header */}
            <div className={`flex items-center justify-between p-3 rounded-t-xl border-x border-t ${column.color}`} title={column.tooltip}>
              <div className="flex items-center gap-2">
                <column.icon className={`w-4 h-4 ${column.headerColor.split(' ')[1]}`} />
                <h3 className={`text-sm font-bold ${column.headerColor.split(' ')[1]}`}>{column.title}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.headerColor}`}>
                {column.count}
              </span>
            </div>

            {/* Column Body */}
            <div className={`flex-1 p-3 border-x border-b rounded-b-xl ${column.color} flex flex-col gap-3 overflow-y-auto`}>
              
              {/* Dummy Cards for < 24h (NOW REQUIRES TEMPLATE) */}
              {column.id === 'cooling' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200 cursor-pointer hover:border-red-400 transition-colors relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-2 h-full bg-red-500"></div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">Visto hace 2h</span>
                    <span className="text-xs font-semibold text-gray-400 flex items-center gap-1"><ShoppingCart className="w-3 h-3" /> Web</span>
                  </div>
                  <h4 className="font-bold text-gray-900">Camila Rodríguez</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">"Quiero la crema anti-acné"</p>
                  
                  <div className="mt-4 flex gap-2">
                    <button className="w-full text-xs font-bold bg-orange-600 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-orange-700">
                      <FileText className="w-3 h-3" /> Usar Plantilla
                    </button>
                  </div>
                </div>
              )}

              {/* Dummy Cards for > 24h */}
              {column.id === 'contact_1' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-red-200 cursor-pointer hover:border-red-400 transition-colors relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-2 h-full bg-red-500"></div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase flex items-center gap-1"><AlertCircle className="w-3 h-3"/> +24h Bloqueo</span>
                  </div>
                  <h4 className="font-bold text-gray-900">Andrés Mendoza</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">"Ayer dejé el carrito..."</p>
                  
                  <div className="mt-4 flex gap-2">
                    <button className="w-full text-xs font-bold bg-orange-600 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-orange-700">
                      <FileText className="w-3 h-3" /> Usar Plantilla
                    </button>
                  </div>
                </div>
              )}

              {column.count === 0 && (
                <div className="h-24 border-2 border-dashed border-gray-200/50 rounded-xl flex items-center justify-center text-xs font-semibold text-gray-400">
                  Vacío
                </div>
              )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
