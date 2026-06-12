import { useState, useEffect } from 'react';
import { AlertCircle, FileText, CheckCircle2, XCircle, Search, ShoppingCart, Loader2, MessageSquare, Handshake, Store, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CrmFilters } from '../components/CrmFilters';
import type { CrmFilterState } from '../components/CrmFilters';
import { LeadChatPanel } from '../components/LeadChatPanel';
import { CountryFlag } from '../utils/flags';

const columns = [
  {
    id: 'abandoned',
    title: 'Carrito Abandonado',
    icon: ShoppingCart,
    color: 'border-blue-200 bg-blue-50/30',
    headerColor: 'bg-blue-100 text-blue-800',
    tooltip: 'Acaba de abandonar el carrito.'
  },
  {
    id: 'bot_sent',
    title: 'Bot Inició Contacto',
    icon: MessageSquare,
    color: 'border-orange-200 bg-orange-50/30',
    headerColor: 'bg-orange-100 text-orange-800',
    tooltip: 'Plantilla de Meta enviada.'
  },
  {
    id: 'client_replied',
    title: 'Cliente Respondió',
    icon: AlertCircle,
    color: 'border-yellow-200 bg-yellow-50/30',
    headerColor: 'bg-yellow-100 text-yellow-800',
    tooltip: 'El cliente interactuó.'
  },
  {
    id: 'negotiating',
    title: 'Negociación / Dudas',
    icon: Handshake,
    color: 'border-purple-200 bg-purple-50/30',
    headerColor: 'bg-purple-100 text-purple-800',
    tooltip: 'A punto de cerrar.'
  },
  {
    id: 'recovered',
    title: 'Venta Recuperada',
    icon: CheckCircle2,
    color: 'border-green-200 bg-green-50/30',
    headerColor: 'bg-green-100 text-green-800',
    tooltip: 'Compra finalizada.'
  },
  {
    id: 'lost',
    title: 'Venta Perdida',
    icon: XCircle,
    color: 'border-gray-200 bg-gray-50/30',
    headerColor: 'bg-gray-100 text-gray-800',
    tooltip: 'Mandar a Ráfagas.'
  }
];

export function CrmRemarketingCarts() {
  const [filters, setFilters] = useState<CrmFilterState | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  useEffect(() => {
    if (filters) {
      loadLeads(filters);
    } else {
      setLeads([]);
    }
  }, [filters]);

  async function loadLeads(f: CrmFilterState) {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*, stores(name, country)')
        .eq('board_type', 'remarketing_carts');
        
      if (f.storeId) {
        query = query.eq('store_id', f.storeId);
      }
      if (f.dateStart) {
        query = query.gte('created_at', f.dateStart);
      }
      if (f.dateEnd) {
        query = query.lte('created_at', f.dateEnd);
      }

      const { data } = await query;
      setLeads(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;

    setLeads(prevLeads => 
      prevLeads.map(lead => 
        lead.id === draggedLeadId ? { ...lead, status: targetStatus } : lead
      )
    );

    try {
      await (supabase as any)
        .from('leads')
        .update({ status: targetStatus })
        .eq('id', draggedLeadId);
    } catch (e) {
      console.error(e);
    }
    
    setDraggedLeadId(null);
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col pb-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-purple-600" /> CRM Remarketing (Carritos Abandonados)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Rescata ventas perdidas. <span className="font-semibold text-orange-600">Regla Meta:</span> Plantilla Obligatoria.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input type="text" placeholder="Buscar cliente..." className="w-full sm:w-64 pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      </div>

      <CrmFilters onFilterChange={setFilters} />

      {/* Kanban Board */}
      <div className="flex-1 flex gap-6 overflow-x-auto pb-4 snap-x relative">
        {columns.map((column) => {
          const columnLeads = leads.filter(l => l.status === column.id);
          return (
            <div 
              key={column.id} 
              className="flex-shrink-0 w-80 flex flex-col snap-center h-full"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={`flex items-center justify-between p-3 rounded-t-xl border-x border-t ${column.color}`} title={column.tooltip}>
                <div className="flex items-center gap-2">
                  <column.icon className={`w-4 h-4 ${column.headerColor.split(' ')[1]}`} />
                  <h3 className={`text-sm font-bold ${column.headerColor.split(' ')[1]}`}>{column.title}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.headerColor}`}>
                  {columnLeads.length}
                </span>
              </div>

              {/* Column Body */}
              <div className={`flex-1 p-3 border-x border-b rounded-b-xl ${column.color} flex flex-col gap-3 overflow-y-auto pb-12`}>
                
                {loading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400"/></div>
                ) : columnLeads.map(lead => (
                  <div 
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-red-200 cursor-grab active:cursor-grabbing hover:border-red-400 transition-colors relative overflow-hidden"
                  >
                    <div className="absolute right-0 top-0 w-2 h-full bg-red-500"></div>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-1.5 items-center">
                        <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                          <AlertCircle className="w-3 h-3"/> +24h Bloqueo
                        </span>
                        {lead.stores?.country && (
                          <span className="leading-none" title={lead.stores.country}>
                            <CountryFlag country={lead.stores.country} />
                          </span>
                        )}
                      </div>
                      {lead.is_banned && (
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                          <Ban className="w-3 h-3"/> Baneado
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-gray-900">{lead.name}</h4>
                    {lead.stores?.name && (
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 flex items-center gap-1 uppercase tracking-wider">
                        <Store className="w-3 h-3" /> {lead.stores.name}
                      </p>
                    )}
                    {lead.product_name && (
                      <p className="text-xs font-semibold text-blue-600 mt-1.5 bg-blue-50 w-fit px-2 py-0.5 rounded">
                        🛍️ {lead.product_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>
                    {lead.notes && (
                      <p className="text-xs text-gray-400 mt-2 bg-gray-50 p-2 rounded line-clamp-2">{lead.notes}</p>
                    )}
                    
                    <div className="mt-4 flex gap-2">
                      <button className="w-full text-xs font-bold bg-orange-600 text-white py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-orange-700">
                        <FileText className="w-3 h-3" /> Usar Plantilla
                      </button>
                    </div>
                  </div>
                ))}

                {!loading && columnLeads.length === 0 && (
                  <div className="h-24 border-2 border-dashed border-gray-200/50 rounded-xl flex items-center justify-center text-xs font-semibold text-gray-400">
                    Vacío
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Chat Panel */}
      {selectedLead && (
        <LeadChatPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onDelete={() => {}}
          onBan={() => {}}
          onUpdateLead={() => {}}
        />
      )}
    </div>
  );
}
