import { Truck, CheckCircle2, Package, Search, ExternalLink, MessageCircle } from 'lucide-react';

export function Orders() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Confirmación de Pedidos</h1>
          <p className="mt-2 text-sm text-gray-500">
            Pedidos ingresados vía ShopyEasy/Dropi listos para enviar confirmación de despacho o guía.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500">
            <Truck className="h-4 w-4" />
            Sincronizar ShopyEasy
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por ID de pedido o cliente..." 
              className="w-full pl-10 pr-4 py-2 border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-1 rounded-md border border-yellow-200">
              12 Pendientes de Confirmar
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2"><Package className="w-4 h-4" /> ID Pedido</div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estado Logístico
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Acción IA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {[
                { id: '#SE-1049', name: 'Laura Vargas', phone: '+57 310 123 3456', product: 'Set Deportivo', status: 'Guía Generada', action: 'Enviar Guía', color: 'bg-blue-600 hover:bg-blue-500' },
                { id: '#SE-1050', name: 'Carlos Ruíz', phone: '+54 9 11 1234 5678', product: 'Joggers UrbanFit', status: 'Empacado', action: 'Enviar Confirmación', color: 'bg-blue-600 hover:bg-blue-500' },
                { id: '#SE-1048', name: 'Pedro Pérez', phone: '+57 315 987 7890', product: 'Camiseta Supreme', status: 'En Ruta', action: 'Confirmado', color: 'bg-green-100 text-green-700 hover:bg-green-100 cursor-default' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-blue-600">{row.id}</span>
                      <ExternalLink className="w-3 h-3 text-gray-400" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.name}</div>
                    <div className="text-xs text-gray-500">{row.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.product}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                      {row.status === 'En Ruta' && <Truck className="w-3 h-3 text-gray-500" />}
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm transition-colors ${row.color}`}>
                      {row.action === 'Confirmado' ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <MessageCircle className="w-4 h-4" />}
                      {row.action !== 'Confirmado' ? row.action : ''}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
