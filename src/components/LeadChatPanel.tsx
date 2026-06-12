import { useState, useEffect } from 'react';
import { X, Send, User, MapPin, Mail, AlignLeft, Phone, Building2, Ban, Trash2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  sender_type: string;
  content: string;
}

export function LeadChatPanel({ 
  lead, 
  onClose, 
  onBan, 
  onDelete,
  onUpdateLead
}: { 
  lead: any, 
  onClose: () => void,
  onBan: (id: string, status: boolean) => void,
  onDelete: (id: string) => void,
  onUpdateLead: (updatedLead: any) => void
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // CRM Form State
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    email: lead?.email || '',
    city: lead?.city || '',
    address: lead?.address || '',
    document_id: lead?.document_id || '',
    notes: lead?.notes || '',
    status: lead?.status || 'new',
    board_type: lead?.board_type || 'sales_wa',
    social_platform: lead?.social_platform || '',
    comment_content: lead?.comment_content || '',
    comment_status: lead?.comment_status || ''
  });
  const [savingForm, setSavingForm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (lead) {
      loadMessages();
      // Sync form if lead changes
      setFormData({
        name: lead.name || '',
        email: lead.email || '',
        city: lead.city || '',
        address: lead.address || '',
        document_id: lead.document_id || '',
        notes: lead.notes || '',
        status: lead.status || 'new',
        board_type: lead.board_type || 'sales_wa',
        social_platform: lead.social_platform || '',
        comment_content: lead.comment_content || '',
        comment_status: lead.comment_status || ''
      });
    }
  }, [lead]);

  useEffect(() => {
    if (!lead) return;
    const channel = supabase.channel(`messages-${lead.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `lead_id=eq.${lead.id}` }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [lead]);

  async function loadMessages() {
    setLoading(true);
    const { data } = await supabase.from('messages').select('*').eq('lead_id', lead.id).order('created_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  }

  async function handleSendMessage() {
    if (!newMessage.trim()) return;
    try {
      const { data } = await (supabase as any).from('messages').insert({
        lead_id: lead.id,
        sender_type: 'human',
        content: newMessage
      }).select().single();
      
      if (data) {
        setMessages([...messages, data]);
        setNewMessage('');
      }
      
      // Call the Vercel API to physically send the message to WhatsApp
      await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          leadId: lead.id,
          message: newMessage
        })
      });

    } catch(e) {
      console.error(e);
    }
  }

  async function handleSaveData() {
    setSavingForm(true);
    setSaveSuccess(false);
    try {
      const { error } = await (supabase as any).from('leads').update(formData).eq('id', lead.id);
      if (error) throw error;
      onUpdateLead({ ...lead, ...formData });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch(e) {
      console.error('Error saving:', e);
      alert('Error al guardar los cambios en la base de datos.');
    }
    setSavingForm(false);
  }

  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-gray-50 shadow-2xl h-full flex flex-col md:flex-row animate-in slide-in-from-right duration-300">
        
        {/* LEFT COLUMN: CHAT INTERFACE */}
        <div className="flex-1 flex flex-col bg-white border-r border-gray-200 h-full relative">
          
          {/* Header */}
          <div className="h-16 px-6 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  {lead.name}
                  {lead.is_banned && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded font-bold">BANEADO</span>}
                  {lead.social_platform === 'instagram' && <span className="bg-pink-100 text-pink-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Instagram</span>}
                  {lead.social_platform === 'messenger' && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">Messenger</span>}
                </h2>
                <p className="text-xs text-gray-500 font-medium">{lead.phone}</p>
              </div>
            </div>
            <div className="flex gap-2">
               <button onClick={() => onBan(lead.id, lead.is_banned)} className={`p-2 rounded-lg transition-colors ${lead.is_banned ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`} title={lead.is_banned ? "Quitar Baneo" : "Banear Cliente"}>
                 <Ban className="w-5 h-5"/>
               </button>
               <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                 <X className="w-6 h-6"/>
               </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}>
             {loading ? (
               <div className="flex justify-center mt-10"><div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>
             ) : messages.length === 0 ? (
               <div className="text-center mt-20 text-gray-400 bg-white/80 p-4 rounded-2xl mx-auto max-w-sm shadow-sm backdrop-blur-sm border border-gray-100">
                 No hay mensajes todavía. Envía un mensaje para iniciar la conversación.
               </div>
             ) : (
               messages.map(msg => (
                 <div key={msg.id} className={`flex flex-col ${msg.sender_type === 'human' || msg.sender_type === 'ai' ? 'items-end' : 'items-start'}`}>
                   <div className={`px-5 py-3 rounded-2xl max-w-[75%] shadow-sm ${
                      msg.sender_type === 'human' ? 'bg-blue-600 text-white rounded-tr-none' : 
                      msg.sender_type === 'ai' ? 'bg-purple-600 text-white rounded-tr-none' : 
                      'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                    }`}>
                      <p className="text-[15px] leading-relaxed">{msg.content}</p>
                   </div>
                   <span className="text-[10px] font-medium text-gray-400 mt-1.5 px-1">
                      {msg.sender_type === 'ai' ? '🤖 Bot IA' : msg.sender_type === 'human' ? '👨‍💻 Tú' : '👤 Cliente'}
                   </span>
                 </div>
               ))
             )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
             <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
               <input 
                 type="text"
                 value={newMessage}
                 onChange={e => setNewMessage(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                 placeholder="Escribe un mensaje aquí..."
                 className="flex-1 bg-transparent border-none outline-none px-4 py-2 text-[15px] text-gray-700 placeholder-gray-400"
               />
               <button 
                 onClick={handleSendMessage} 
                 disabled={!newMessage.trim()}
                 className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
               >
                 <Send className="w-5 h-5" />
               </button>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CRM DATA */}
        <div className="w-full md:w-[380px] bg-gray-50 h-full overflow-y-auto flex flex-col">
          <div className="h-16 px-6 border-b border-gray-200 flex items-center bg-gray-50 sticky top-0 z-10">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400"/> Ficha del Lead
            </h3>
          </div>

          <div className="p-6 space-y-6">
            
            {/* Quick Actions / Info */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
               <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                 <Phone className="w-6 h-6"/>
               </div>
               <div>
                 <p className="text-xs text-gray-500 font-medium">WhatsApp</p>
                 <p className="font-bold text-gray-900">{lead.phone}</p>
               </div>
            </div>

            {/* Edit Form */}
            <div className="space-y-4">

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                <label className="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1.5 block">Tablero (Pestaña)</label>
                <select 
                  value={formData.board_type} 
                  onChange={e => setFormData({...formData, board_type: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm font-semibold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                >
                  <option value="sales_wa">Ventas (WhatsApp)</option>
                  <option value="sales_social">Redes Sociales (DM/Comentarios)</option>
                  <option value="remarketing_wa">Remarketing (Chats WA)</option>
                  <option value="remarketing_carts">Remarketing (Carritos Abandonados)</option>
                  <option value="logistics">Logística y Despachos</option>
                  <option value="customer_service">Atención al Cliente</option>
                </select>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <label className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1.5 block">Etapa del Embudo (Columna)</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  {formData.board_type === 'remarketing_wa' ? (
                    <>
                      <option value="cold_lead">Prospecto Inicial</option>
                      <option value="qualifying">En Cualificación</option>
                      <option value="hot_lead">Alta Intención</option>
                      <option value="negotiating">Negociación</option>
                      <option value="recovered">Venta Cerrada</option>
                      <option value="lost">Descartado</option>
                    </>
                  ) : formData.board_type === 'remarketing_carts' ? (
                    <>
                      <option value="abandoned">Carrito Abandonado</option>
                      <option value="contacting">Contactando</option>
                      <option value="negotiating">Negociando Oferta</option>
                      <option value="recovered">Venta Recuperada</option>
                      <option value="lost">Venta Perdida</option>
                    </>
                  ) : formData.board_type === 'logistics' ? (
                    <>
                      <option value="nuevo">Nuevo Pedido</option>
                      <option value="confirmado">Confirmado / Aprobado</option>
                      <option value="en_ruta">En Ruta</option>
                      <option value="entregado">Entregado Exitoso</option>
                      <option value="novedad">Novedad / Retraso</option>
                      <option value="devolucion">Devolución</option>
                      <option value="falsa">Venta Falsa / Caída</option>
                    </>
                  ) : (
                    <>
                      <option value="new">Nuevo Lead</option>
                      <option value="contacted">Contacto Inicial</option>
                      <option value="interaction">Interacción</option>
                      <option value="closed">Cierre Exitoso</option>
                      <option value="lost">Venta Perdida</option>
                      <option value="human">Intervención Humana</option>
                    </>
                  )}
                </select>
              </div>

              {(formData.board_type === 'sales_social' || formData.comment_content) && (
                <div className="p-3 bg-pink-50 border border-pink-100 rounded-xl space-y-3">
                  <h4 className="text-xs font-bold text-pink-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                     Datos de Redes Sociales
                  </h4>
                  <div>
                    <label className="text-[10px] font-bold text-pink-600 uppercase">Plataforma</label>
                    <select 
                      value={formData.social_platform} 
                      onChange={e => setFormData({...formData, social_platform: e.target.value})}
                      className="w-full px-3 py-1.5 bg-white border border-pink-200 rounded text-sm outline-none"
                    >
                      <option value="">Desconocido / Otro</option>
                      <option value="messenger">Facebook Messenger</option>
                      <option value="instagram">Instagram Direct</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-pink-600 uppercase">Comentario del Cliente</label>
                    <textarea 
                      value={formData.comment_content} 
                      onChange={e => setFormData({...formData, comment_content: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2 bg-white border border-pink-200 rounded text-sm outline-none resize-none"
                      placeholder="Ej. Precio por favor"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-pink-600 uppercase">Estado del Comentario</label>
                    <select 
                      value={formData.comment_status} 
                      onChange={e => setFormData({...formData, comment_status: e.target.value})}
                      className={`w-full px-3 py-1.5 bg-white border border-pink-200 rounded text-sm font-semibold outline-none ${formData.comment_status === 'deleted' ? 'text-red-600' : 'text-green-600'}`}
                    >
                      <option value="">Sin revisar</option>
                      <option value="active">Activo (Público)</option>
                      <option value="deleted">Eliminado (Por el bot)</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><User className="w-3 h-3"/> Nombre Completo</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" />
              </div>
              
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Building2 className="w-3 h-3"/> Cédula / Documento</label>
                <input type="text" value={formData.document_id} onChange={e => setFormData({...formData, document_id: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" placeholder="Ej. 1012345678" />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Mail className="w-3 h-3"/> Correo Electrónico</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" placeholder="cliente@correo.com" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> Ciudad</label>
                  <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" placeholder="Ej. Bogotá" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><MapPin className="w-3 h-3"/> Dirección Exacta</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" placeholder="Calle 123 #45-67" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1"><AlignLeft className="w-3 h-3"/> Notas Internas (Privado)</label>
                <textarea 
                  value={formData.notes} 
                  onChange={e => setFormData({...formData, notes: e.target.value})} 
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all resize-none" 
                  placeholder="Escribe detalles importantes de la venta aquí..."
                />
              </div>

              <button 
                onClick={handleSaveData}
                disabled={savingForm || saveSuccess}
                className={`w-full py-3 rounded-xl font-bold shadow-sm transition-colors disabled:opacity-70 flex justify-center items-center gap-2 ${saveSuccess ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
              >
                {savingForm ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : 
                 saveSuccess ? <><CheckCircle2 className="w-5 h-5"/> ¡Guardado con Éxito!</> : 
                 'Guardar Cambios'}
              </button>
              
              <div className="pt-6 mt-6 border-t border-gray-200">
                <button 
                  onClick={() => onDelete(lead.id)}
                  className="w-full py-2.5 flex justify-center items-center gap-2 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4"/> Eliminar Lead Permanentemente
                </button>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
