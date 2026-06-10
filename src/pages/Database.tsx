import { useState } from 'react';
import { Search, Filter, Download, UserCircle, Phone, Tag, Calendar, LayoutGrid, ChevronDown, Megaphone, X } from 'lucide-react';

export function Database() {
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Base de Datos de Contactos</h1>
          <p className="mt-2 text-sm text-gray-500">
            Registro histórico de leads. Filtra tu audiencia para enviar campañas masivas de Difusión.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-soft transition-colors ${showFilters ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200' : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-50'}`}
          >
            <Filter className="h-4 w-4" />
            Filtros Avanzados
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-soft ring-1 ring-inset ring-gray-200 hover:bg-gray-50">
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden shadow-sm border border-gray-100">
        
        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="p-5 border-b border-gray-100 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" /> Constructor de Audiencias (Filtros Cruzados)
              </h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Date Filters */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha de Creación</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setDateFilter('today')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${dateFilter === 'today' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Hoy</button>
                  <button onClick={() => setDateFilter('yesterday')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${dateFilter === 'yesterday' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Ayer</button>
                  <button onClick={() => setDateFilter('7days')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border ${dateFilter === '7days' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>Últimos 7 días</button>
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 min-w-[120px]">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input type="date" className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 focus:ring-1 focus:ring-blue-500" title="Desde" />
                    </div>
                    <span className="text-xs font-bold text-gray-400">a</span>
                    <div className="relative flex-1 min-w-[120px]">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input type="date" className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 focus:ring-1 focus:ring-blue-500" title="Hasta" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Country Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">País</label>
                <div className="relative">
                  <select className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="all">Todos los países</option>
                    <option value="CO">Colombia</option>
                    <option value="MX">México</option>
                    <option value="AR">Argentina</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Store Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tienda Asignada</label>
                <div className="relative">
                  <select className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="all">Todas las tiendas</option>
                    <option value="dropi_co">Dropi Colombia</option>
                    <option value="belleza_co">Nicho Belleza CO</option>
                    <option value="dropi_ar">Dropi Argentina</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Product Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Producto de Interés</label>
                <div className="relative">
                  <select className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="all">Todos los productos</option>
                    <option value="p1">Smartwatch X8</option>
                    <option value="p2">Joggers UrbanFit</option>
                    <option value="p3">Serum Facial</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center bg-blue-50/50 -mx-5 -mb-5 p-5 rounded-b-lg">
              <span className="text-sm font-semibold text-blue-800">
                1,245 leads encontrados con estos filtros
              </span>
              <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-soft transition-all">
                <Megaphone className="w-4 h-4" />
                Crear Campaña de Difusión para estos Leads
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, teléfono o email..." 
              className="w-full pl-10 pr-4 py-2 border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 bg-white shadow-sm"
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
