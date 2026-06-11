import { useState, useEffect } from 'react';
import { RefreshCcw, Clock, AlertCircle, FileText, CheckCircle2, XCircle, Search, MessageSquare, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CrmFilters } from '../components/CrmFilters';
import type { CrmFilterState } from '../components/CrmFilters';
import { LeadChatPanel } from '../components/LeadChatPanel';

const columns = [
  { id: 'cooling', title: 'Enfriados (< 24h)', icon: Clock, color: 'border-blue-200 bg-blue-50/30', headerColor: 'bg-blue-100 text-blue-800', tooltip: 'Permite mensajes de texto libre.' },
  { id: 'contact_1', title: 'Re-contacto 1 (> 24h)', icon: AlertCircle, color: 'border-orange-200 bg-orange-50/30', headerColor: 'bg-orange-100 text-orange-800', tooltip: 'Plantilla de Meta obligatoria.' },
  { id: 'contact_2', title: 'Re-contacto 2 (Oferta)', icon: FileText, color: 'border-purple-200 bg-purple-50/30', headerColor: 'bg-purple-100 text-purple-800', tooltip: 'Plantilla de Meta obligatoria.' },
  { id: 'recovered', title: 'Recuperados', icon: CheckCircle2, color: 'border-green-200 bg-green-50/30', headerColor: 'bg-green-100 text-green-800', tooltip: 'Saltaron de nuevo a Ventas.' },
  { id: 'lost', title: 'Perdidos Definitivos', icon: XCircle, color: 'border-gray-200 bg-gray-50/30', headerColor: 'bg-gray-100 text-gray-800', tooltip: 'No respondieron tras 48h.' }
];

export function CrmRemarketingWa() {
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
        .eq('board_type', 'remarketing');
        
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <RefreshCcw className="w-6 h-6 text-blue-600" /> CRM Remarketing (Chats de Venta)
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Rescata ventas caídas de WhatsApp. <span className="font-semibold text-blue-600">Regla Meta:</span> Texto Libre permitido si es menor a 24h.
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
              <div className={`flex items-center justify-between p-3 rounded-t-xl border-x border-t ${column.color}`} title={column.tooltip}>
                <div className="flex items-center gap-2">
                  <column.icon className={`w-4 h-4 ${column.headerColor.split(' ')[1]}`} />
                  <h3 className={`text-sm font-bold ${column.headerColor.split(' ')[1]}`}>{column.title}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${column.headerColor}`}>
                  {columnLeads.length}
                </span>
              </div>

              <div className={`flex-1 p-3 border-x border-b rounded-b-xl ${column.color} flex flex-col gap-3 overflow-y-auto pb-12`}>
                {loading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400"/></div>
                ) : columnLeads.map(lead => (
                  <div 
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => setSelectedLead(lead)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-blue-200 cursor-grab active:cursor-grabbing hover:border-blue-400 transition-colors relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">Visto hace 2h</span>
                      <span className="text-xs font-semibold text-gray-400 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> WhatsApp</span>
                    </div>
                    <h4 className="font-bold text-gray-900">{lead.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>
                    {lead.notes && (
                      <p className="text-xs text-gray-400 mt-2 bg-gray-50 p-2 rounded line-clamp-2">{lead.notes}</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button className="flex-1 text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 py-1.5 rounded-lg hover:bg-gray-100">Ver Chat</button>
                      <button className="flex-1 text-xs font-bold bg-blue-50 text-blue-700 py-1.5 rounded-lg hover:bg-blue-100">Plantilla</button>
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
