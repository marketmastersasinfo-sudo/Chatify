import { useState, useEffect } from 'react';
import { MessageSquare, AlertCircle, CheckCircle2, Store, Plus, Loader2, X, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

const columns = [
  { id: 'new', title: 'Nuevo Lead', color: 'border-blue-500', bg: 'bg-blue-50' },
  { id: 'contact', title: 'Contacto Inicial', color: 'border-purple-500', bg: 'bg-purple-50' },
  { id: 'interaction', title: 'Interacción', color: 'border-orange-500', bg: 'bg-orange-50' },
  { id: 'closed', title: 'Cierre Exitoso', color: 'border-green-500', bg: 'bg-green-50' },
  { id: 'lost', title: 'Venta Perdida', color: 'border-gray-500', bg: 'bg-gray-50' },
  { id: 'human', title: '🛑 Intervención Humana', color: 'border-red-500', bg: 'bg-red-50' },
];

export function CrmSales() {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  
  // Drag and Drop State
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  // Chat Pane State
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStoreId) {
      loadLeads(selectedStoreId);
    } else {
      setLeads([]);
    }
  }, [selectedStoreId]);

  useEffect(() => {
    if (selectedLead) {
      loadMessages(selectedLead.id);
    }
  }, [selectedLead]);

  async function loadStores() {
    try {
      const { data } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setStores(data);
        setSelectedStoreId((data as any[])[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function loadLeads(storeId: string) {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('store_id', storeId)
        .eq('board_type', 'sales_wa');
      setLeads(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function loadMessages(leadId: string) {
    try {
      const { data } = await supabase.from('messages').select('*').eq('lead_id', leadId).order('created_at', { ascending: true });
      setMessages(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCreateLead() {
    if (!newLeadName || !newLeadPhone || !selectedStoreId) return;
    try {
      const { data, error } = await supabase.from('leads').insert({
        store_id: selectedStoreId,
        name: newLeadName,
        phone: newLeadPhone,
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

  async function handleSendMessage() {
    if (!newMessage.trim() || !selectedLead) return;
    try {
      const { data } = await supabase.from('messages').insert({
        lead_id: selectedLead.id,
        sender_type: 'human',
        content: newMessage
      } as any).select().single();
      
      if (data) {
        setMessages([...messages, data]);
        setNewMessage('');
      }
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
          {/* Store Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
            <Store className="w-4 h-4 text-gray-500" />
            <select 
              value={selectedStoreId} 
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="text-sm font-semibold text-gray-700 bg-transparent outline-none cursor-pointer"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              {stores.length === 0 && <option value="">Sin tiendas</option>}
            </select>
          </div>

          <button 
            onClick={() => setIsAddingLead(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            <Plus className="w-4 h-4" /> Nuevo Lead Manual
          </button>
        </div>
      </div>

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
          <div className="w-96 bg-white border border-gray-200 shadow-2xl rounded-2xl flex flex-col shrink-0 overflow-hidden">
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold">{selectedLead.name}</h3>
                <p className="text-xs text-blue-100">{selectedLead.phone}</p>
              </div>
              <button onClick={() => setSelectedLead(null)} className="hover:bg-blue-500 p-1 rounded-md"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <p className="text-xs text-center text-gray-400 mt-10">No hay mensajes en el historial.</p>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender_type === 'human' || msg.sender_type === 'ai' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${
                      msg.sender_type === 'human' ? 'bg-blue-600 text-white rounded-br-none' : 
                      msg.sender_type === 'ai' ? 'bg-purple-600 text-white rounded-br-none' : 
                      'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1">
                      {msg.sender_type === 'ai' ? 'Bot IA' : msg.sender_type === 'human' ? 'Agente' : 'Cliente'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl text-sm"
              />
              <button onClick={handleSendMessage} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
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
