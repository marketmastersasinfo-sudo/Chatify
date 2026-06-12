import { useState, useEffect } from 'react';
import { Search, Filter, Download, UserCircle, Phone, Tag, Calendar, LayoutGrid, ChevronDown, Megaphone, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Database() {
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState('all');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const leadsPerPage = 50;

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          store:stores(name)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setLeads(data || []);
    } catch (e) {
      console.error('Error loading leads:', e);
    } finally {
      setLoading(false);
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'nuevo':
      case 'contact_1':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'confirmado':
      case 'contact_2':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'despachado':
      case 'contact_3':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'falsa':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusName = (status: string) => {
    switch (status.toLowerCase()) {
      // Logistics
      case 'nuevo': return 'Nuevo Pedido';
      case 'confirmado': return 'Pedido Confirmado';
      case 'en_ruta': return 'En Ruta';
      case 'entregado': return 'Entregado';
      case 'novedad': return 'Novedad';
      case 'devolucion': return 'Devolución';
      case 'falsa': return 'Venta Falsa';
      
      // Remarketing Carts
      case 'abandoned': return 'Carrito Abandonado';
      case 'contacting': return 'Contactando (Carrito)';
      case 'negotiating': return 'Negociando';
      case 'recovered': return 'Recuperado (Venta)';
      case 'lost': return 'Perdido (Descartado)';

      // Remarketing WA
      case 'cold_lead': return 'Prospecto Inicial (Rem. WA)';
      case 'qualifying': return 'En Cualificación';
      case 'hot_lead': return 'Alta Intención';

      // Sales WA / Social
      case 'new': return 'Nuevo Chat (Ventas)';
      case 'contacted': return 'Contacto Inicial';
      case 'interaction': return 'Interacción';
      case 'closed': return 'Cierre Exitoso';
      case 'human': return 'Asesor Humano';

      // Fallback
      default: return status;
    }
  };

  const totalPages = Math.ceil(leads.length / leadsPerPage);
  const displayedLeads = leads.slice((currentPage - 1) * leadsPerPage, currentPage * leadsPerPage);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
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
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rango de Fechas</label>
                <div className="relative">
                  <select 
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="all">Todo el tiempo</option>
                    <option value="today">Hoy</option>
                    <option value="yesterday">Ayer</option>
                    <option value="7days">Últimos 7 días</option>
                    <option value="30days">Últimos 30 días</option>
                    <option value="month">Este Mes</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Country Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">País</label>
                <div className="relative">
                  <select className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-lg text-gray-700 appearance-none focus:ring-1 focus:ring-blue-500 bg-white">
                    <option value="all">Todos los países</option>
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
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-between items-center bg-blue-50/50 -mx-5 -mb-5 p-5 rounded-b-lg">
              <span className="text-sm font-semibold text-blue-800">
                {leads.length} leads encontrados con estos filtros
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
              placeholder="Buscar por nombre o teléfono..." 
              className="w-full pl-10 pr-4 py-2 border-gray-200 rounded-xl text-sm focus:ring-1 focus:ring-blue-500 bg-white shadow-sm"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Mostrando {displayedLeads.length} de {leads.length} contactos
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                    <p className="mt-2 text-sm text-gray-500">Cargando contactos...</p>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No se encontraron contactos en la base de datos.
                  </td>
                </tr>
              ) : (
                displayedLeads.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-gray-900">{row.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600">
                      +{row.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {row.traffic_source || 'Manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                      {row.store?.name || 'Desconocida'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(row.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${getStatusStyle(row.status)}`}>
                        {getStatusName(row.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
            <div className="flex-1 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-bold">{(currentPage - 1) * leadsPerPage + 1}</span> a <span className="font-bold">{Math.min(currentPage * leadsPerPage, leads.length)}</span> de <span className="font-bold">{leads.length}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-gray-50 text-sm font-bold text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
