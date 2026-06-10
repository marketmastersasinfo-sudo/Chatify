import { Search, Filter, Download, UserCircle, Phone, Tag, Calendar, LayoutGrid } from 'lucide-react';

export function Database() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Base de Datos de Contactos</h1>
          <p className="mt-2 text-sm text-gray-500">
            Registro histórico de todos los leads capturados. Rastrea orígenes, etapas y tiendas asociadas.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-soft ring-1 ring-inset ring-gray-200 hover:bg-gray-50">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500">
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, teléfono o email..." 
              className="w-full pl-10 pr-4 py-2 border-gray-200 rounded-xl text-sm focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Mostrando 1-10 de 1,245 contactos
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2"><UserCircle className="w-4 h-4" /> Contacto</div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4" /> Teléfono</div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2"><Tag className="w-4 h-4" /> Origen (Tráfico)</div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Tienda Asociada</div>
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Fecha Creación</div>
                </th>
                <th scope="col" className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {[
                { name: 'Andrés López', phone: '+57 320 123 4567', source: 'Facebook Ads', store: 'Dropi Colombia', date: '10 Jun 2026', status: 'Pedido Confirmado', statusColor: 'bg-purple-100 text-purple-700 border-purple-200' },
                { name: 'María Gómez', phone: '+57 311 987 6543', source: 'TikTok Ads', store: 'Dropi Colombia', date: '09 Jun 2026', status: 'Despachado', statusColor: 'bg-green-100 text-green-700 border-green-200' },
                { name: 'Carlos Ruíz', phone: '+54 9 11 1234 5678', source: 'Instagram DM', store: 'Dropi Argentina', date: '08 Jun 2026', status: 'Recolectando Datos', statusColor: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {row.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.store}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {row.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${row.statusColor}`}>
                      {row.status}
                    </span>
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
