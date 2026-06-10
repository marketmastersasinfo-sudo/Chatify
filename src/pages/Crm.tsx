import { Clock, Phone, ShoppingBag } from 'lucide-react';

const columns = [
  { id: 'new', title: 'Nuevo Lead', count: 12, color: 'border-blue-500', bg: 'bg-blue-50' },
  { id: 'data', title: 'Recolectando Datos', count: 8, color: 'border-indigo-500', bg: 'bg-indigo-50' },
  { id: 'confirmed', title: 'Pedido Confirmado', count: 24, color: 'border-purple-500', bg: 'bg-purple-50' },
  { id: 'shipped', title: 'Despachado', count: 15, color: 'border-green-500', bg: 'bg-green-50' },
  { id: 'issue', title: 'Novedad / Retorno', count: 3, color: 'border-red-500', bg: 'bg-red-50' },
];

const mockCards = [
  { id: 1, column: 'new', name: 'Andrés López', phone: '+57 320 *** 1234', time: '10 min', source: 'Facebook Ads', product: 'Joggers UrbanFit' },
  { id: 2, column: 'new', name: 'María Gómez', phone: '+57 311 *** 5678', time: '15 min', source: 'Instagram DM', product: 'Camiseta Supreme' },
  { id: 3, column: 'data', name: 'Carlos Ruíz', phone: '+57 300 *** 9012', time: '2 min', source: 'TikTok Ads', product: 'Joggers UrbanFit' },
  { id: 4, column: 'confirmed', name: 'Laura Vargas', phone: '+57 310 *** 3456', time: '1 hora', source: 'Facebook Ads', product: 'Set Deportivo' },
  { id: 5, column: 'shipped', name: 'Pedro Pérez', phone: '+57 315 *** 7890', time: '1 día', source: 'Email', product: 'Joggers UrbanFit' },
];

export function Crm() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col pt-6 pb-2 px-2 max-w-[100vw] overflow-hidden">
      <div className="px-6 mb-6 shrink-0 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">CRM Kanban (Método 5C)</h1>
          <p className="text-sm text-gray-500 mt-1">Arrastra las tarjetas para cambiar el estado manualmente. Flujo Pago Contra Entrega.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50">
            Filtros Avanzados
          </button>
          <button className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
            + Nuevo Chat Manual
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto px-6 pb-6">
        <div className="flex gap-6 h-full min-w-max">
          {columns.map((col) => (
            <div key={col.id} className="w-80 flex flex-col bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden shrink-0">
              {/* Column Header */}
              <div className={`p-4 border-t-4 ${col.color} bg-white shadow-sm flex justify-between items-center z-10 shrink-0`}>
                <h3 className="font-bold text-gray-900 text-sm">{col.title}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${col.bg} text-gray-700`}>
                  {col.count}
                </span>
              </div>

              {/* Column Body (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {mockCards.filter(c => c.column === col.id).map(card => (
                  <div key={card.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-2 items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                          {card.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900">{card.name}</h4>
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {card.time}</span>
                        </div>
                      </div>
                      <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded font-medium border border-gray-200">
                        {card.source}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        {card.phone}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1.5 rounded-md">
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {card.product}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
