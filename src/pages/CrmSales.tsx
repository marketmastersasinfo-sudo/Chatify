import { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, CheckCircle2, Store, Plus, Loader2, X, Ban } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LeadChatPanel } from '../components/LeadChatPanel';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { CrmFilters } from '../components/CrmFilters';
import type { CrmFilterState } from '../components/CrmFilters';

const columns = [
  { id: 'new', title: 'Nuevo Lead', color: 'border-blue-500', bg: 'bg-blue-50' },
  { id: 'contact', title: 'Contacto Inicial', color: 'border-purple-500', bg: 'bg-purple-50' },
  { id: 'interaction', title: 'Interacción', color: 'border-orange-500', bg: 'bg-orange-50' },
  { id: 'closed', title: 'Cierre Exitoso', color: 'border-green-500', bg: 'bg-green-50' },
  { id: 'lost', title: 'Venta Perdida', color: 'border-gray-500', bg: 'bg-gray-50' },
  { id: 'human', title: '🛑 Intervención Humana', color: 'border-red-500', bg: 'bg-red-50' },
];

export function CrmSales() {
  const [filters, setFilters] = useState<CrmFilterState | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  
  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Chat Pane State
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
        .eq('board_type', 'sales_wa');
        
      if (f.storeId) {
        query = query.eq('store_id', f.storeId);
      } else {
        // Si no hay storeId pero hay país, necesitaríamos filtrar por las tiendas de ese país.
        // Como 'leads' solo tiene store_id, tendríamos que hacer un join con stores.
        // Pero para mantenerlo simple, si hay filtro global de supabase, lo hacemos con .in('store_id', ...)
        // Por ahora lo dejamos sin filtro de tienda si f.storeId está vacío (trae todas).
      }

      if (f.dateStart) {
        query = query.gte('created_at', f.dateStart);
      }
      if (f.dateEnd) {
        query = query.lte('created_at', f.dateEnd);
      }

      const { data } = await query;
      
      // Si hay filtro por país y no hay storeId específico, filtramos en cliente si es necesario
      // O podríamos hacer un query más avanzado. Para remarketing está bien.
      
      setLeads(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleCreateLead() {
    if (!newLeadName || !newLeadPhone || !filters?.storeId) return;
    try {
      const formattedPhone = formatPhoneNumber(newLeadPhone);

      const { data, error } = await supabase.from('leads').insert({
        store_id: filters?.storeId,
        name: newLeadName,
        phone: formattedPhone,
        traffic_source: 'Manual (Vendedor)',
        board_type: 'sales_wa',
        status: 'new'
      } as any).select().single();

      if (data && !error) {
        setLeads([...leads, data]);
        setIsAddingLead(false);
        setNewLeadName('');
        setNewLeadPhone('');
      }
    } catch (e) {
      console.error(e);
    }
  }

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;

    // Optimistic UI Update
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
      // Revert if error (omitted for brevity)
    }
    
    setDraggedLeadId(null);
  };

  async function handleDeleteLead(leadId: string) {
    if (!confirm('¿Estás seguro de eliminar este contacto y todo su chat permanentemente?')) return;
    try {
      await supabase.from('leads').delete().eq('id', leadId);
      setLeads(leads.filter(l => l.id !== leadId));
      if (selectedLead?.id === leadId) setSelectedLead(null);
    } catch(e) {
      console.error(e);
    }
  }

  async function handleBanLead(leadId: string, currentStatus: boolean) {
    try {
      await (supabase as any).from('leads').update({ is_banned: !currentStatus }).eq('id', leadId);
      setLeads(leads.map(l => l.id === leadId ? { ...l, is_banned: !currentStatus } : l));
      if (selectedLead?.id === leadId) setSelectedLead({ ...selectedLead, is_banned: !currentStatus });
    } catch(e) {
      console.error(e);
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col relative">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM: Ventas WhatsApp</h1>
          <p className="text-sm text-gray-500 mt-1">Arrastra las tarjetas. Las columnas se guardan en tiempo real en Supabase.</p>
        </div>
        
        <div className="flex gap-4 items-center">
          <button 
            onClick={() => setIsAddingLead(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            <Plus className="w-4 h-4" /> Nuevo Lead Manual
          </button>
        </div>
      </div>

      <CrmFilters onFilterChange={setFilters} />

      <div className="flex-1 overflow-x-auto pb-4 flex gap-6">
        {/* Kanban Board Area */}
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
                      <p className="text-xs text-gray-500 mt-1">{lead.phone}</p>
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                        {col.id === 'human' ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : col.id === 'closed' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-500 truncate">Ver detalles del chat...</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Chat / Lead Details Pane */}
        {selectedLead && (
          <LeadChatPanel 
            lead={selectedLead} 
            onClose={() => setSelectedLead(null)}
            onBan={handleBanLead}
            onDelete={handleDeleteLead}
            onUpdateLead={(updated) => {
              setLeads(leads.map(l => l.id === updated.id ? updated : l));
              setSelectedLead(updated);
            }}
          />
        )}
      </div>

      {/* Modal Add Lead */}
      {isAddingLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-900">Añadir Lead Manual</h3>
               <button onClick={() => setIsAddingLead(false)}><X className="w-5 h-5 text-gray-400"/></button>
             </div>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre</label>
                 <input value={newLeadName} onChange={e => setNewLeadName(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-lg" />
               </div>
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                 <input value={newLeadPhone} onChange={e => setNewLeadPhone(e.target.value)} type="text" className="w-full px-3 py-2 border rounded-lg" />
               </div>
               <button onClick={handleCreateLead} className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg mt-2">Guardar Lead</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
