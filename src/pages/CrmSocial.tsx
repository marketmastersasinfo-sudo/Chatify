import { MessageCircle, Clock, AlertCircle, Link } from 'lucide-react';

const columns = [
  { id: 'comentario', title: 'Comentario Público', count: 24, color: 'border-blue-500', bg: 'bg-blue-50' },
  { id: 'dm_enviado', title: 'DM Enviado', count: 15, color: 'border-purple-500', bg: 'bg-purple-50' },
  { id: 'charla_dm', title: 'Conversación en DM', count: 8, color: 'border-orange-500', bg: 'bg-orange-50' },
  { id: 'venta_dm', title: 'Venta Directa DM', count: 2, color: 'border-green-500', bg: 'bg-green-50' },
  { id: 'derivado', title: 'Derivado a WA', count: 6, color: 'border-teal-500', bg: 'bg-teal-50' },
  { id: 'moderado', title: '🛑 Moderado / Humano', count: 1, color: 'border-red-500', bg: 'bg-red-50' },
];

export function CrmSocial() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM: Redes Sociales</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de comentarios de FB/IG manejado por Claude 3 Haiku.</p>
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
                    <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                      Instagram
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Hace 2m
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 text-sm">@carlos_runner</h4>
                  <p className="text-xs text-gray-500 mt-1">Post: "Promo Tenis Run"</p>
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                    {col.id === 'derivado' ? (
                      <Link className="w-4 h-4 text-teal-500" />
                    ) : col.id === 'moderado' ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <MessageCircle className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs text-gray-500 truncate">Claude: "Te dejé un DM..."</span>
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
