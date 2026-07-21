import { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, CheckCircle2, Plus, Loader2, X, Ban, Store, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { LeadChatPanel } from '../components/LeadChatPanel';
import { formatPhoneNumber } from '../utils/phoneFormatter';
import { CrmFilters } from '../components/CrmFilters';
import type { CrmFilterState } from '../components/CrmFilters';
import { CountryFlag } from '../utils/flags';
import { TrafficBadge } from '../components/TrafficBadge';

const columns = [
  { id: 'new', title: 'Nuevo Lead', color: 'border-blue-500', bg: 'bg-blue-50' },
  { id: 'inquiry', title: 'Interesado / Preguntando', color: 'border-purple-500', bg: 'bg-purple-50' },
  { id: 'negotiating', title: 'En Cierre / Cotizando', color: 'border-orange-500', bg: 'bg-orange-50' },
  { id: 'verifying_address', title: 'Verificando Dirección', color: 'border-pink-500', bg: 'bg-pink-50' },
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

    const channel = supabase
      .channel('sales_leads_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: 'board_type=eq.sales_wa'
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLeads((prev) => [payload.new as any, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setLeads((prev) =>
              prev.map((lead) => (lead.id === payload.new.id ? { ...lead, ...payload.new } : lead))
            );
          } else if (payload.eventType === 'DELETE') {
            setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  async function loadLeads(f: CrmFilterState) {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*, stores(name, country)')
        .eq('board_type', 'sales_wa');
        
      if (f.storeIds && f.storeIds.length > 0) {
        query = query.in('store_id', f.storeIds);
      } else if (f.storeIds && f.storeIds.length === 0) {
        query = query.eq('store_id', '00000000-0000-0000-0000-000000000000');
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
        
      // TRACKING: Disparar evento al soltar la tarjeta
      const lead = leads.find(l => l.id === draggedLeadId);
      if (lead) {
        let eventName = '';
        if (targetStatus === 'inquiry') eventName = 'AddToCart';
        else if (targetStatus === 'negotiating') eventName = 'InitiateCheckout';
        else if (targetStatus === 'closed') eventName = 'Purchase';
        else if (targetStatus === 'new') eventName = 'ViewContent';

        if (eventName) {
          fetch('/api/tracking/fire-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              leadId: draggedLeadId,
              eventName,
              value: lead.total_price || 0,
              currency: 'COP'
            })
          }).catch(console.error);
        }
      }
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

  function handleExportExcel() {
    const closedLeads = leads.filter(l => l.status === 'closed');
    if (closedLeads.length === 0) {
      alert('No hay ventas cerradas para exportar.');
      return;
    }

    const data = closedLeads.map(lead => {
      let observaciones = lead.notes || '';
      if (lead.sector) observaciones += ` | Barrio/Sector: ${lead.sector}`;
      if (lead.postal_code) observaciones += ` | CP: ${lead.postal_code}`;
      if (lead.email) observaciones += ` | Email: ${lead.email}`;

      return {
        'NOMBRES': lead.name || '',
        'APELLIDOS': lead.last_name || '',
        'TELEFONO': lead.phone || '',
        'DIRECCION': lead.address || '',
        'CIUDAD': lead.city || '',
        'DEPARTAMENTO': lead.department || '',
        'CODIGO PRODUCTO': lead.product_name || '',
        'CANTIDAD': 1,
        'OBSERVACIONES': observaciones.replace(/^ \| /, '') // Clean up leading separator
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');
    XLSX.writeFile(workbook, `Ventas_Dropi_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg text-sm font-semibold text-white shadow-sm hover:bg-green-500"
          >
            <Download className="w-4 h-4" /> Exportar Dropi (Excel)
          </button>
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
                      className={`p-4 bg-white rounded-xl shadow-sm border-l-4 ${col.color} cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow shrink-0`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-1.5 items-center">
                          <TrafficBadge source={lead.traffic_source} />
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
                      <h4 className="font-bold text-gray-900 text-sm">{lead.name}</h4>
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
              if (updated.board_type !== 'sales_wa') {
                setLeads(leads.filter(l => l.id !== updated.id));
                setSelectedLead(null);
              } else {
                setLeads(leads.map(l => l.id === updated.id ? updated : l));
              }
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
