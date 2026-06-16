import { useState, useEffect, useRef } from 'react';
import { Search, Phone, Package, MapPin, Store, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LeadChatPanel } from '../components/LeadChatPanel';
import { useSearchParams } from 'react-router-dom';

const BOARD_LABELS: Record<string, { label: string; color: string }> = {
  logistics: { label: 'Logística ShopyEasy', color: 'bg-blue-100 text-blue-700' },
  sales_wa: { label: 'Ventas WhatsApp', color: 'bg-purple-100 text-purple-700' },
  social_media: { label: 'Redes Sociales', color: 'bg-pink-100 text-pink-700' },
  remarketing_wa: { label: 'Remarketing WA', color: 'bg-orange-100 text-orange-700' },
  remarketing_carts: { label: 'Carritos Abandonados', color: 'bg-yellow-100 text-yellow-700' },
};

interface SearchResultsProps {
  initialQuery?: string;
}

export function SearchResults({ initialQuery = '' }: SearchResultsProps) {
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') || initialQuery;
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Sync from URL param changes (when Header navigates with new query)
  useEffect(() => {
    const newQ = searchParams.get('q') || '';
    setQuery(newQ);
  }, [searchParams]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(query.trim());
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  async function doSearch(q: string) {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('leads')
        .select('*, stores(name, country)')
        .or(
          `name.ilike.%${q}%,phone.ilike.%${q}%,product_name.ilike.%${q}%,address.ilike.%${q}%,notes.ilike.%${q}%,city.ilike.%${q}%`
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setResults(data || []);
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    }
    setSearched(true);
    setLoading(false);
  }

  const handleUpdateLead = (updated: any) => {
    setResults(results.map(l => l.id === updated.id ? { ...l, ...updated } : l));
    setSelectedLead({ ...selectedLead, ...updated });
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('¿Eliminar este contacto permanentemente?')) return;
    await supabase.from('leads').delete().eq('id', leadId);
    setResults(results.filter(l => l.id !== leadId));
    setSelectedLead(null);
  };

  const handleBanLead = async (leadId: string, current: boolean) => {
    await (supabase as any).from('leads').update({ is_banned: !current }).eq('id', leadId);
    setResults(results.map(l => l.id === leadId ? { ...l, is_banned: !current } : l));
    if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, is_banned: !current });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Buscador Global</h1>
        <p className="text-sm text-gray-500 mt-1">Busca por nombre, teléfono, producto, ciudad o número de guía en todos los tableros.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        {loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-500 animate-spin" />}
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Ej: Juan García, 573001234567, Jogger Negro, número de guía..."
          className="w-full pl-12 pr-12 py-4 text-base bg-white border-2 border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-400"
        />
      </div>

      {/* Search Tag Hints */}
      {!searched && query.length < 2 && (
        <div className="flex flex-wrap gap-2">
          {['nombre del cliente', 'número de celular', 'producto pedido', 'ciudad', 'dirección', 'número de guía (en notas)'].map(hint => (
            <span key={hint} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full font-medium">
              🔍 {hint}
            </span>
          ))}
        </div>
      )}

      {/* Results */}
      {searched && (
        <div>
          <p className="text-sm text-gray-500 mb-4 font-medium">
            {results.length === 0
              ? `Sin resultados para "${query}"`
              : `${results.length} resultado${results.length !== 1 ? 's' : ''} para "${query}"`}
          </p>

          {results.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <Search className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No encontramos resultados.</p>
              <p className="text-sm text-gray-400 mt-1">Intenta con otro nombre, número o producto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(lead => {
                const board = BOARD_LABELS[lead.board_type] || { label: lead.board_type, color: 'bg-gray-100 text-gray-600' };
                return (
                  <div
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-blue-200 cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Lead Info */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                          {lead.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-gray-900 text-sm">{lead.name}</h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${board.color}`}>
                              {board.label}
                            </span>
                            {lead.is_banned && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">🚫 Baneado</span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {lead.phone}
                            </span>
                            {lead.stores?.name && (
                              <span className="flex items-center gap-1">
                                <Store className="w-3 h-3" /> {lead.stores.name}
                              </span>
                            )}
                            {lead.city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {lead.city}
                              </span>
                            )}
                          </div>

                          {lead.product_name && (
                            <div className="mt-2 flex items-center gap-1.5">
                              <Package className="w-3 h-3 text-blue-500" />
                              <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded-md truncate max-w-md">
                                {lead.product_name}
                              </span>
                            </div>
                          )}

                          {/* Order ID / guía from notes */}
                          {lead.notes && (() => {
                            const orderMatch = lead.notes.match(/Order ID:\s*(\S+)/);
                            return orderMatch ? (
                              <p className="text-[11px] text-gray-400 mt-1 font-mono">
                                # Orden: {orderMatch[1]}
                              </p>
                            ) : null;
                          })()}
                        </div>
                      </div>

                      {/* Right: Status + Arrow */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          lead.status === 'confirmado' ? 'bg-green-50 text-green-700 border-green-200' :
                          lead.status === 'nuevo' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          lead.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          {lead.status}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lead Chat Panel */}
      {selectedLead && (
        <LeadChatPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onBan={handleBanLead}
          onDelete={handleDeleteLead}
          onUpdateLead={handleUpdateLead}
        />
      )}
    </div>
  );
}
