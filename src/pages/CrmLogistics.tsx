import { Truck, Clock, AlertCircle, MapPin, CheckCircle2 } from 'lucide-react';

const columns = [
  { id: 'nuevo', title: 'Nuevo Pedido Web', count: 18, color: 'border-blue-500', bg: 'bg-blue-50' },
  { id: 'foto', title: 'Foto Fachada Enviada', count: 12, color: 'border-purple-500', bg: 'bg-purple-50' },
  { id: 'modificacion', title: 'Charla Activa', count: 4, color: 'border-orange-500', bg: 'bg-orange-50' },
  { id: 'confirmado', title: 'Dirección 100% Confirmada', count: 8, color: 'border-green-500', bg: 'bg-green-50' },
  { id: 'despachado', title: 'Despachado / En Ruta', count: 45, color: 'border-teal-500', bg: 'bg-teal-50' },
  { id: 'falsa', title: '🛑 Dir. Falsa / Cancelado', count: 3, color: 'border-red-500', bg: 'bg-red-50' },
];

export function CrmLogistics() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM: Confirmaciones ShopyEasy</h1>
        <p className="text-sm text-gray-500 mt-1">Validación de pedidos directos vía Google Maps API y GPT-4o mini.</p>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max h-full">
          {columns.map(col => (
            <div key={col.id} className="w-80 flex flex-col h-full">
              <div className={`px-4 py-3 rounded-xl ${col.bg} border border-gray-200 mb-4 flex items-center justify-between`}>
                <h3 className="font-bold text-gray-900 text-sm">{col.title}</h3>
                <span className="bg-white text-gray-700 text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                  {col.count}
                </span>
              </div>

              {/* Fake Card Example */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                <div className={`p-4 bg-white rounded-xl shadow-sm border-l-4 ${col.color} cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold px-2 py-1 bg-indigo-100 text-indigo-700 rounded-md">
                      #SE-1050
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Hace 10m
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm">Pedro Pérez</h4>
                  <p className="text-xs text-gray-500 mt-1">Cra 45 #12-34, Bogotá</p>
                  
                  {/* Google Maps Thumbnail for relevant columns */}
                  {(col.id === 'foto' || col.id === 'confirmado' || col.id === 'falsa') && (
                    <div className="mt-2 w-full h-16 bg-gray-200 rounded-md overflow-hidden relative">
                      <img src="https://maps.googleapis.com/maps/api/streetview?size=400x100&location=4.6097,-74.0817&key=INVALID" alt="Street View" className="w-full h-full object-cover opacity-50" />
                      {col.id === 'falsa' && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">No Encontrada</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    {col.id === 'falsa' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : col.id === 'confirmado' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : col.id === 'despachado' ? (
                      <Truck className="w-4 h-4 text-teal-500" />
                    ) : (
                      <MapPin className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500 truncate">
                      {col.id === 'confirmado' ? 'Dirección Exacta Confirmada' : 'Validando calle...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
