import { useState, useEffect } from 'react';
import { X, Send, User, MapPin, Mail, AlignLeft, Phone, Building2, Ban, Trash2, CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  sender_type: string;
  content: string;
  metadata?: any;
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
    comment_status: lead?.comment_status || '',
    product_name: lead?.product_name || '',
    total_price: lead?.total_price || ''
  });
  const [savingForm, setSavingForm] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Templates State
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<{ id: string, name: string, body: string, variables: string[], values: Record<string, string> } | null>(null);
  const [fetchingTemplate, setFetchingTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      loadMessages();
      loadTemplates();
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
        comment_status: lead.comment_status || '',
        product_name: lead.product_name || '',
        total_price: lead.total_price || ''
      });
    }
  }, [lead]);

  // Handle board changes to set the correct default status
  useEffect(() => {
    if (lead && formData.board_type !== lead.board_type) {
      let defaultStatus = 'new';
      if (formData.board_type === 'remarketing_wa') defaultStatus = 'cold_lead';
      else if (formData.board_type === 'remarketing_carts') defaultStatus = 'abandoned';
      else if (formData.board_type === 'logistics') defaultStatus = 'nuevo';
      setFormData(prev => ({ ...prev, status: defaultStatus }));
    }
  }, [formData.board_type, lead]);

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

  async function loadTemplates() {
    try {
      const { data } = await supabase
        .from('store_templates')
        .select('*')
        .eq('store_id', lead.store_id)
        .not('template_name', 'is', null)
        .neq('template_name', '');
      // Only show templates that have a valid name configured
      setTemplates((data || []).filter((t: any) => t.template_name?.trim()));
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchAndPreviewTemplate(templateId: string, templateName: string) {
    setFetchingTemplate(templateId);
    try {
      const res = await fetch(`/api/get-template?templateId=${templateId}`);
      if (!res.ok) throw new Error('Error obteniendo la plantilla desde Twilio');
      const data = await res.json();
      
      const initialValues: Record<string, string> = {};
      data.variables.forEach((v: string) => {
        if (v === '1') initialValues[v] = lead.name;
        else if (v === '2') initialValues[v] = lead.address || '';
        else if (v === '3') initialValues[v] = lead.phone || '';
        else if (v === '4') initialValues[v] = lead.product_name || 'tu pedido';
        else if (v === '5') initialValues[v] = lead.total_price || '';
        else initialValues[v] = '';
      });

      setPreviewTemplate({
        id: templateId,
        name: templateName,
        body: data.body,
        variables: data.variables,
        values: initialValues
      });
      setShowTemplates(false);
    } catch (e: any) {
      console.error(e);
      alert('Error al cargar la plantilla: ' + e.message);
    }
    setFetchingTemplate(null);
  }

  async function handleConfirmSendTemplate() {
    if (!previewTemplate) return;
    setSendingTemplate(previewTemplate.id);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'template',
          leadId: lead.id,
          templateId: previewTemplate.id,
          templateType: 'custom',
          variables: previewTemplate.values
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error desconocido de Twilio');
      }

      await loadMessages();
      setPreviewTemplate(null);
    } catch(e: any) {
      console.error(e);
      alert(`Error al enviar la plantilla "${previewTemplate.name}":\n${e.message}`);
    }
    setSendingTemplate(null);
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
      await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', leadId: lead.id, message: newMessage })
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
               {/* AI Toggle */}
               {(() => {
                 let isPaused = false;
                 for (let i = messages.length - 1; i >= 0; i--) {
                   if (messages[i].content === '[SISTEMA] PAUSAR_IA') { isPaused = true; break; }
                   if (messages[i].content === '[SISTEMA] REANUDAR_IA') { isPaused = false; break; }
                 }
                 return (
                   <button 
                     onClick={async () => {
                       const command = isPaused ? '[SISTEMA] REANUDAR_IA' : '[SISTEMA] PAUSAR_IA';
                       const { data } = await (supabase as any).from('messages').insert({
                         lead_id: lead.id, sender_type: 'ai', content: command
                       }).select().single();
                       if (data) setMessages([...messages, data]);
                     }}
                     className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${isPaused ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                     title={isPaused ? "Reanudar Sophia AI" : "Pausar Sophia AI"}
                   >
                     {isPaused ? '🤖 IA Pausada' : '🤖 IA Activa'}
                   </button>
                 );
               })()}

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
                   <div 
                    className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm whitespace-pre-wrap break-words ${
                      msg.sender_type === 'human' ? 'bg-blue-600 text-white rounded-tr-none' : 
                      msg.sender_type === 'ai' ? 'bg-purple-600 text-white rounded-tr-none' : 
                      'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                    }`}
                  >
                      {msg.metadata?.image_url && (
                        <img src={msg.metadata.image_url} alt="Media" className="w-full h-auto rounded-xl mb-2 object-cover" />
                      )}
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
             <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all relative">
               
               {/* Templates Menu */}
               <div className="relative">
                 <button 
                   onClick={() => setShowTemplates(!showTemplates)}
                   className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                   title="Plantillas Oficiales de WhatsApp"
                 >
                   <FileText className="w-5 h-5" />
                 </button>
                 
                 {showTemplates && (
                   <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
                     <div className="px-3 pb-2 mb-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase">Plantillas Disponibles</div>
                     {templates.length === 0 ? (
                       <div className="px-4 py-2 text-sm text-gray-500">No hay plantillas disponibles.</div>
                     ) : (
                       templates.map(t => (
                         <button 
                           key={t.id}
                           onClick={() => fetchAndPreviewTemplate(t.id, t.template_name)}
                           disabled={fetchingTemplate === t.id}
                           className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between"
                         >
                           <span className="truncate">{t.template_name}</span>
                           {fetchingTemplate === t.id && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
                         </button>
                       ))
                     )}
                   </div>
                 )}
               </div>

               <input 
                 type="text"
                 value={newMessage}
                 onChange={e => setNewMessage(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                 placeholder="Escribe un mensaje aquí..."
                 className="flex-1 bg-transparent border-none outline-none px-2 py-2 text-[15px] text-gray-700 placeholder-gray-400"
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

          {/* Preview Template Modal */}
          {previewTemplate && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-lg w-full flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-gray-900">Variables de Plantilla</h3>
                  <button onClick={() => setPreviewTemplate(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5"/></button>
                </div>
                
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-6 flex-1 overflow-y-auto text-[15px] text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {previewTemplate.body.split(/(\{\{\d+\}\})/).map((part, i) => {
                    const match = part.match(/\{\{(\d+)\}\}/);
                    if (match) {
                      const varId = match[1];
                      const val = previewTemplate.values[varId];
                      return <span key={i} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">{val || `{{${varId}}}`}</span>;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </div>

                {previewTemplate.variables.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completa los espacios:</h4>
                    {previewTemplate.variables.map(v => (
                      <div key={v} className="flex items-center gap-3">
                        <label className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1.5 rounded w-10 text-center">{'{{' + v + '}}'}</label>
                        <input 
                          type="text" 
                          value={previewTemplate.values[v] || ''}
                          onChange={e => setPreviewTemplate(prev => prev ? {...prev, values: {...prev.values, [v]: e.target.value}} : null)}
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                          placeholder={`Valor para la variable ${v}...`}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 mt-auto">
                  <button onClick={() => setPreviewTemplate(null)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancelar</button>
                  <button 
                    onClick={handleConfirmSendTemplate}
                    disabled={sendingTemplate !== null}
                    className="flex-[2] px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-70 flex justify-center items-center gap-2 transition-colors shadow-sm"
                  >
                    {sendingTemplate ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5"/>}
                    Enviar Plantilla a Cliente
                  </button>
                </div>
              </div>
            </div>
          )}
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
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3"/> Dirección Exacta</label>
                    {formData.address && formData.city && (
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${formData.address}, ${formData.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3"/> Ver en Google Maps
                      </a>
                    )}
                  </div>
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all" placeholder="Calle 123 #45-67" />
                </div>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-orange-700 uppercase tracking-wider flex items-center gap-1 mb-2">
                   Datos del Pedido
                </h4>
                <div>
                  <label className="text-[10px] font-bold text-orange-600 uppercase">Producto y Variantes</label>
                  <input type="text" value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500 transition-all" placeholder="Ej. Jogger Talla L Negro" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-orange-600 uppercase">Precio Total</label>
                  <input type="text" value={formData.total_price} onChange={e => setFormData({...formData, total_price: e.target.value})} className="w-full px-3 py-2 bg-white border border-orange-200 rounded-lg outline-none text-sm focus:ring-2 focus:ring-orange-500 transition-all" placeholder="Ej. $120.000" />
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
