import { Megaphone, Users, Send, CheckCircle2, MessageSquareReply, Play, Settings2 } from 'lucide-react';

export function Broadcast() {
  const columns = [
    {
      id: 'audience',
      title: 'Audiencia Lista',
      icon: Users,
      count: 1,
      color: 'border-blue-200 bg-blue-50/30',
      headerColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'sending',
      title: 'Enviando Ráfaga',
      icon: Send,
      count: 1,
      color: 'border-purple-200 bg-purple-50/30',
      headerColor: 'bg-purple-100 text-purple-800',
    },
    {
      id: 'delivered',
      title: 'Entregados / Leídos',
      icon: CheckCircle2,
      count: 0,
      color: 'border-green-200 bg-green-50/30',
      headerColor: 'bg-green-100 text-green-800',
    },
    {
      id: 'replied',
      title: 'Respondidos (Pasan a Ventas)',
      icon: MessageSquareReply,
      count: 0,
      color: 'border-orange-200 bg-orange-50/30',
      headerColor: 'bg-orange-100 text-orange-800',
    }
  ];

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col pb-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-blue-600" />
            CRM Difusión y Campañas Masivas
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Monitorea el progreso de tus envíos masivos. Las respuestas saltan automáticamente al Tablero de Ventas.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500 transition-colors">
            <Play className="h-4 w-4" />
            Iniciar Nueva Campaña
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x">
        {columns.map((column) => (
          <div key={column.id} className="flex-shrink-0 w-80 flex flex-col snap-center">
            <div className={`flex items-center justify-between p-3 rounded-t-xl border-x border-t ${column.color}`}>
              <div className="flex items-center gap-2">
                <column.icon className={`w-4 h-4 ${column.headerColor.split(' ')[1]}`} />
                <h3 className={`text-sm font-bold ${column.headerColor.split(' ')[1]}`}>{column.title}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.headerColor}`}>
                {column.count}
              </span>
            </div>
            
            <div className={`flex-1 p-3 border-x border-b rounded-b-xl ${column.color} flex flex-col gap-3 overflow-y-auto`}>
              
              {/* Dummy Cards Based on Column */}
              {column.id === 'audience' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer group relative">
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1 text-gray-400 hover:text-blue-600 rounded bg-gray-50"><Settings2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md uppercase tracking-wider">Campaña Programada</span>
                  <h4 className="font-bold text-gray-900 mt-3">Re-venta Zapatos Dropi CO</h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">Audiencia: Colombia, Compras previas, Zapatos.</p>
                  
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                      <Users className="w-3.5 h-3.5" /> 1,245 leads
                    </div>
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"><Play className="w-3 h-3"/> Lanzar Ahora</button>
                  </div>
                </div>
              )}

              {column.id === 'sending' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-purple-200 cursor-default">
                  <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 w-max">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span> En Ejecución
                  </span>
                  <h4 className="font-bold text-gray-900 mt-3">Black Friday Smartwatch X8</h4>
                  <p className="text-xs text-gray-500 mt-1">Plantilla: promo_black_friday</p>
                  
                  <div className="mt-4 pt-3 border-t border-gray-50">
                    <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
                      <span>Progreso</span>
                      <span className="text-purple-600">450 / 2,000</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '22%' }}></div>
                    </div>
                  </div>
                </div>
              )}

              {column.count === 0 && (
                <div className="h-24 border-2 border-dashed border-gray-200/50 rounded-xl flex items-center justify-center text-xs font-semibold text-gray-400">
                  Sin campañas en esta etapa
                </div>
              )}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
