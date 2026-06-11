import { useState, useEffect } from 'react';
import { MessageCircle, AlertCircle, Link, Loader2, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CrmFilters } from '../components/CrmFilters';
import type { CrmFilterState } from '../components/CrmFilters';
import { LeadChatPanel } from '../components/LeadChatPanel';

const columns = [
  { id: 'comentario', title: 'Comentario Público', color: 'border-blue-500', bg: 'bg-blue-50' },
  { id: 'dm_enviado', title: 'DM Enviado', color: 'border-purple-500', bg: 'bg-purple-50' },
  { id: 'charla_dm', title: 'Conversación en DM', color: 'border-orange-500', bg: 'bg-orange-50' },
  { id: 'venta_dm', title: 'Venta Directa DM', color: 'border-green-500', bg: 'bg-green-50' },
  { id: 'derivado', title: 'Derivado a WA', color: 'border-teal-500', bg: 'bg-teal-50' },
  { id: 'moderado', title: '🛑 Moderado / Humano', color: 'border-red-500', bg: 'bg-red-50' },
];

export function CrmSocial() {
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
        .select('*')
        .eq('board_type', 'social_media');
        
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
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM: Redes Sociales</h1>
        <p className="text-sm text-gray-500 mt-1">Gestión de comentarios de FB/IG manejado por IA.</p>
      </div>

      <CrmFilters onFilterChange={setFilters} />

      <div className="flex-1 overflow-x-auto pb-4 flex gap-6">
        <div className="flex gap-6 min-w-max h-full flex-1">
          {columns.map(col => {
            const columnLeads = leads.filter(l => l.status === col.id);
            return (
              <div 
                key={col.id} 
                className="w-80 flex flex-col h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
              >
                <div className={`px-4 py-3 rounded-xl ${col.bg} border border-gray-200 mb-4 flex items-center justify-between`}>
                  <h3 className="font-bold text-gray-900 text-sm">{col.title}</h3>
                  <span className="bg-white text-gray-700 text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                    {columnLeads.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto pb-12">
                  {loading ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400"/></div>
                  ) : columnLeads.map(lead => (
                    <div 
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      onClick={() => setSelectedLead(lead)}
                      className={`p-4 bg-white rounded-xl shadow-sm border-l-4 ${col.color} cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-700 rounded-md">
                          {lead.traffic_source}
                        </span>
                        {lead.is_banned && (
                          <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                            <Ban className="w-3 h-3"/> Baneado
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-gray-900 text-sm">{lead.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{lead.phone || 'Sin número'}</p>
                      {lead.notes && (
                        <p className="text-xs text-gray-400 mt-2 bg-gray-50 p-2 rounded line-clamp-2">{lead.notes}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                        {col.id === 'derivado' ? (
                          <Link className="w-4 h-4 text-teal-500" />
                        ) : col.id === 'moderado' ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <MessageCircle className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500 truncate">Ver detalles...</span>
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
      </div>

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
