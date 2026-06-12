import { useState, useEffect } from 'react';
import { RefreshCcw, Plus, Image as ImageIcon, MessageSquareDashed, AlertCircle, CheckCircle2, Loader2, Save, X, Sparkles, Wand2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function TemplateBuilder() {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Template Form State
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTemplateToView, setSelectedTemplateToView] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'MARKETING',
    language: 'es_CO',
    headerType: 'NONE', // NONE, IMAGE
    headerImageUrl: '', // Solo de uso interno si queremos preview
    bodyText: 'Hola {{1}}, gracias por tu compra. Te enviaremos a la ciudad {{2}}.',
    variableExamples: { '1': 'Juan', '2': 'Bogotá' } as Record<string, string>
  });

  // AI Form State
  const [isAIPromptOpen, setIsAIPromptOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerateAI() {
    if (!aiPrompt) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error de la IA');
      
      const { name, category, bodyText, variableExamples } = json.data;
      setNewTemplate({
        ...newTemplate,
        name: name || '',
        category: category || 'MARKETING',
        bodyText: bodyText || '',
        variableExamples: variableExamples || {}
      });
      setIsAIPromptOpen(false);
      setAiPrompt('');
    } catch (err: any) {
      setError(err.message);
    }
    setIsGenerating(false);
  }

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  function formatTimeElapsed(createdAt: string) {
    if (!createdAt) return 'Meta puede tardar hasta 24h';
    const diff = now.getTime() - new Date(createdAt).getTime();
    if (diff < 0) return 'lleva 0m en revisión';
    const totalMinutes = Math.floor(diff / 60000);
    if (totalMinutes < 60) return `lleva ${totalMinutes} min en revisión`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `lleva ${hours}h y ${mins}m en revisión`;
  }

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchMetaTemplates(selectedStore.id);
    } else {
      setTemplates([]);
    }
  }, [selectedStore]);

  async function loadStores() {
    try {
      const { data } = await supabase.from('stores').select('*').order('name');
      setStores(data || []);
      if (data && data.length > 0) setSelectedStore(data[0]);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMetaTemplates(storeId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meta/templates?storeId=${storeId}`);
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.details?.error?.message || json.error || 'Error desconocido');
      }

      const metaData = json.data || [];

      // Fetch our custom creation times
      const { data: localData } = await (supabase as any)
        .from('meta_templates')
        .select('name, created_at')
        .eq('store_id', storeId);

      const mergedTemplates = metaData.map((t: any) => {
        const local = localData?.find((l: any) => l.name === t.name);
        return { ...t, created_at: local ? local.created_at : null };
      });

      setTemplates(mergedTemplates);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function handleCreateTemplate() {
    if (!selectedStore) return;
    setSaving(true);
    setError(null);

    try {
      // Validar nombre (solo letras minúsculas y guiones bajos)
      if (!/^[a-z0-9_]+$/.test(newTemplate.name)) {
        throw new Error("El nombre solo puede contener letras minúsculas, números y guiones bajos (_).");
      }

      // Armar el JSON estricto que pide Meta
      const bodyComponent: any = {
        type: 'BODY',
        text: newTemplate.bodyText
      };

      // Extract unique variables to generate examples required by Meta
      const matches = newTemplate.bodyText.match(/\{\{\d+\}\}/g);
      if (matches && matches.length > 0) {
        // Get unique numbers from {{1}}, {{2}}...
        const uniqueNumbers = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, '')))).sort((a, b) => parseInt(a) - parseInt(b));
        
        // Map user provided examples or fallback to generic
        const exampleValues = uniqueNumbers.map(num => newTemplate.variableExamples[num as keyof typeof newTemplate.variableExamples] || `Ejemplo ${num}`);
        
        bodyComponent.example = {
          body_text: [exampleValues]
        };
      }

      const components: any[] = [bodyComponent];

      if (newTemplate.headerType === 'IMAGE') {
        components.push({
          type: 'HEADER',
          format: 'IMAGE',
          // Meta requiere un handle o un URL de ejemplo para imágenes
          // Aquí usaremos un ejemplo estático temporal requerido por Meta para la revisión
          example: {
            header_handle: [
               "https://scontent.whatsapp.net/v/t61.24694-34/436662446_460613243171833_7612711019129598816_n.jpg"
            ]
          }
        });
      }

      const payload = {
        name: newTemplate.name,
        category: newTemplate.category,
        language: newTemplate.language,
        components: components
      };

      const res = await fetch(`/api/meta/templates?storeId=${selectedStore.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.details?.error?.message || json.error || 'Error creando plantilla');
      }

      // Éxito
      setIsCreating(false);
      setNewTemplate({ ...newTemplate, name: '', bodyText: '', variableExamples: {} });
      fetchMetaTemplates(selectedStore.id); // Recargar la lista

    } catch (err: any) {
      setError(err.message);
    }
    setSaving(false);
  }

  const getStatusBadge = (template: any) => {
    const status = template.status;
    switch(status) {
      case 'APPROVED': return <span className="bg-green-100 text-green-700 px-2 py-1 flex items-center gap-1 text-[10px] uppercase font-bold rounded-full"><CheckCircle2 className="w-3 h-3"/> Aprobada</span>;
      case 'REJECTED': return <span className="bg-red-100 text-red-700 px-2 py-1 flex items-center gap-1 text-[10px] uppercase font-bold rounded-full"><AlertCircle className="w-3 h-3"/> Rechazada</span>;
      case 'PENDING': return (
        <div className="flex flex-col gap-0.5">
          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 flex items-center gap-1 text-[10px] uppercase font-bold rounded-full w-fit">
            <Loader2 className="w-3 h-3 animate-spin"/> En Revisión
          </span>
          <span className="text-[9px] text-gray-400 font-medium">
            {formatTimeElapsed(template.created_at)}
          </span>
        </div>
      );
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 flex items-center gap-1 text-[10px] uppercase font-bold rounded-full">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Creador de Plantillas Meta</h1>
          <p className="mt-1 text-sm text-gray-500">Conexión directa con WhatsApp Cloud API para crear y aprobar plantillas.</p>
        </div>
        
        {/* Selector de Tienda */}
        {stores.length > 0 && (
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
            <span className="text-sm font-semibold text-gray-600">Tienda:</span>
            <select 
              value={selectedStore?.id || ''} 
              onChange={(e) => setSelectedStore(stores.find(s => s.id === e.target.value))}
              className="text-sm font-bold text-blue-600 border-none focus:ring-0 bg-transparent cursor-pointer"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name} (WABA: {s.waba_id ? 'Conectado' : 'Falta WABA'})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Error de Meta API</h3>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isCreating && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8 transition-all">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5"/> Crear Nueva Plantilla Oficial
            </h3>
            <button onClick={() => setIsCreating(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
            {/* Formulario Izquierdo */}
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-purple-900 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-purple-600"/> Generación con IA</h4>
                  <p className="text-xs text-purple-700 mt-0.5">Describe qué plantilla necesitas y la IA redactará el texto y ejemplos requeridos por Meta.</p>
                </div>
                <button onClick={() => setIsAIPromptOpen(!isAIPromptOpen)} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm shadow-purple-500/20 hover:bg-purple-700 transition-colors shrink-0">
                  {isAIPromptOpen ? 'Cerrar IA' : 'Usar IA'}
                </button>
              </div>

              {isAIPromptOpen && (
                <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-purple-100 mb-6 relative">
                  <div className="absolute -top-2 left-8 w-4 h-4 bg-purple-100 rotate-45"></div>
                  <div className="relative z-10">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">¿Qué quieres decir en la plantilla?</label>
                    <textarea 
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="Ej: Quiero una plantilla para cobrar carritos abandonados diciendo que tenemos 10% de descuento y envío gratis hoy..."
                      className="w-full px-4 py-3 bg-gray-50 border border-purple-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
                      rows={3}
                    />
                    <div className="mt-3 flex justify-end">
                      <button 
                        onClick={handleGenerateAI}
                        disabled={!aiPrompt || isGenerating}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                        Generar Magia
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Nombre Interno (sin espacios)</label>
                <input 
                  type="text" 
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')})}
                  placeholder="ej: carrito_oferta_v2" 
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <p className="text-[10px] text-gray-400 mt-1">Solo letras minúsculas y guiones bajos.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Categoría</label>
                  <select 
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MARKETING">Marketing (Promos)</option>
                    <option value="UTILITY">Utility (Confirmaciones)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Idioma</label>
                  <select 
                    value={newTemplate.language}
                    onChange={(e) => setNewTemplate({...newTemplate, language: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="es_CO">Español (Colombia)</option>
                    <option value="es_MX">Español (México)</option>
                    <option value="es">Español (General)</option>
                    <option value="en_US">Inglés</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Cabecera</label>
                <select 
                    value={newTemplate.headerType}
                    onChange={(e) => setNewTemplate({...newTemplate, headerType: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="NONE">Sin Cabecera (Solo Texto)</option>
                    <option value="IMAGE">Imagen (Se sube al enviar el mensaje)</option>
                  </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">Texto del Mensaje</label>
                <textarea 
                  value={newTemplate.bodyText}
                  onChange={(e) => setNewTemplate({...newTemplate, bodyText: e.target.value})}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                  placeholder="Hola {{1}}, ¿sigues interesado en {{2}}?"
                />
                <p className="text-[11px] text-gray-500 mt-2 font-medium">Usa <code className="bg-gray-100 text-blue-600 px-1 py-0.5 rounded">{'{{1}}'}</code>, <code className="bg-gray-100 text-blue-600 px-1 py-0.5 rounded">{'{{2}}'}</code> para inyectar variables automáticas.</p>
              </div>

              {/* Dynamic Variable Examples */}
              {(() => {
                const matches = newTemplate.bodyText.match(/\{\{\d+\}\}/g);
                if (!matches) return null;
                const uniqueNumbers = Array.from(new Set(matches.map(m => m.replace(/[\{\}]/g, '')))).sort((a, b) => parseInt(a) - parseInt(b));
                if (uniqueNumbers.length === 0) return null;

                return (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h5 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">Ejemplos para las variables</h5>
                    <p className="text-[10px] text-blue-600 mb-3">Meta exige ejemplos reales de lo que irá en las variables para aprobar la plantilla rápidamente.</p>
                    <div className="grid grid-cols-2 gap-3">
                      {uniqueNumbers.map(num => (
                        <div key={num} className="flex items-center gap-2">
                          <span className="bg-blue-200 text-blue-800 text-xs font-bold px-2 py-1 rounded w-10 text-center">{`{{${num}}}`}</span>
                          <input 
                            type="text" 
                            placeholder={`Ej: ${num === '1' ? 'Juan' : num === '2' ? 'Bogotá' : 'Ejemplo'}`}
                            value={(newTemplate.variableExamples as any)[num] || ''}
                            onChange={(e) => {
                              setNewTemplate({
                                ...newTemplate,
                                variableExamples: {
                                  ...newTemplate.variableExamples,
                                  [num]: e.target.value
                                }
                              });
                            }}
                            className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded text-xs focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">Cancelar</button>
                <button 
                  onClick={handleCreateTemplate}
                  disabled={saving || !newTemplate.name || !newTemplate.bodyText}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                  Enviar a Revisión de Meta
                </button>
              </div>
            </div>

            {/* Vista Previa Derecha (Estilo WhatsApp) */}
            <div className="bg-gray-100/50 rounded-2xl p-6 border border-gray-200 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
              
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 relative z-10">Vista Previa Móvil</h4>
              
              <div className="bg-[#EFEAE2] w-[300px] h-auto min-h-[400px] rounded-[2rem] shadow-xl border-[6px] border-gray-900 relative z-10 overflow-hidden flex flex-col">
                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><MessageSquareDashed className="w-4 h-4 text-white"/></div>
                  <div className="font-semibold text-sm">Chatify Test</div>
                </div>
                
                <div className="flex-1 p-4 flex flex-col justify-start">
                  <div className="bg-white rounded-xl rounded-tl-none p-2 shadow-sm max-w-[90%] self-start relative">
                    {/* Flecha globito */}
                    <div className="absolute top-0 -left-2 w-0 h-0 border-t-[0px] border-t-transparent border-r-[10px] border-r-white border-b-[10px] border-b-transparent"></div>
                    
                    {newTemplate.headerType === 'IMAGE' && (
                      <div className="w-full h-32 bg-gray-200 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed font-[system-ui]">
                      {/* Resaltar variables falsas en amarillo con su ejemplo */}
                      {newTemplate.bodyText.split(/(\{\{\d+\}\})/).map((part, i) => {
                        if (part.match(/\{\{\d+\}\}/)) {
                          const num = part.replace(/[\{\}]/g, '');
                          const exampleText = (newTemplate.variableExamples as any)[num];
                          return (
                            <span key={i} className="bg-yellow-200 text-yellow-800 px-1 rounded mx-0.5 font-bold">
                              {exampleText ? exampleText : part}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </p>
                    <div className="text-[10px] text-gray-400 text-right mt-1">12:00 PM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Plantillas Sincronizadas</h2>
            {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => selectedStore && fetchMetaTemplates(selectedStore.id)}
              disabled={loading || !selectedStore}
              className="text-gray-500 hover:text-blue-600 font-semibold text-sm flex items-center gap-1.5 transition-colors"
            >
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}/> Sincronizar
            </button>
            <button 
              onClick={() => setIsCreating(true)}
              className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nueva Plantilla
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4 pl-6">Nombre de Plantilla</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Idioma</th>
                <th className="p-4">Estado (Meta)</th>
                <th className="p-4 text-right pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {templates.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No se encontraron plantillas. Haz clic en "Sincronizar" o crea una nueva.
                  </td>
                </tr>
              ) : (
                templates.map((tpl: any) => (
                  <tr key={tpl.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6 font-bold text-gray-900">{tpl.name}</td>
                    <td className="p-4 text-gray-600 font-medium text-xs">{tpl.category}</td>
                    <td className="p-4 text-gray-500">{tpl.language}</td>
                    <td className="p-4">
                      {getStatusBadge(tpl)}
                    </td>
                    <td className="p-4 text-right pr-6">
                      <button 
                        onClick={() => setSelectedTemplateToView(tpl)}
                        className="text-blue-600 font-bold hover:text-blue-800 transition-colors text-xs"
                      >
                        Ver Detalles
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Template Details Modal */}
      {selectedTemplateToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
            
            {/* Left: Info */}
            <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedTemplateToView.name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    {getStatusBadge(selectedTemplateToView.status)}
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{selectedTemplateToView.category}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{selectedTemplateToView.language}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mt-8">
                {selectedTemplateToView.components?.map((comp: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3">Componente: {comp.type}</h4>
                    {comp.format && <p className="text-xs text-gray-500 mb-2 font-semibold">Formato: {comp.format}</p>}
                    <p className="text-sm text-gray-800 whitespace-pre-wrap font-[system-ui] leading-relaxed">
                      {comp.text || 'Contenido multimedia / sin texto'}
                    </p>
                    {comp.example?.body_text && (
                      <div className="mt-4 pt-3 border-t border-gray-200">
                        <p className="text-xs font-bold text-gray-500 mb-2">Ejemplos configurados:</p>
                        <div className="flex flex-wrap gap-2">
                          {comp.example.body_text[0]?.map((ex: string, i: number) => (
                            <span key={i} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-semibold">
                              {`{{${i+1}}}`} = {ex}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: WhatsApp Preview */}
            <div className="w-full md:w-[380px] bg-gray-100/50 p-8 flex flex-col items-center justify-center relative">
              <button 
                onClick={() => setSelectedTemplateToView(null)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-500 hover:text-gray-900 shadow-sm transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay"></div>
              
              <div className="bg-[#EFEAE2] w-full max-w-[320px] h-auto min-h-[450px] rounded-[2.5rem] shadow-2xl border-[8px] border-gray-900 relative z-10 overflow-hidden flex flex-col">
                <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <MessageSquareDashed className="w-4 h-4 text-white"/>
                  </div>
                  <div className="font-semibold text-sm">WhatsApp Preview</div>
                </div>
                
                <div className="flex-1 p-4 flex flex-col justify-start">
                  <div className="bg-white rounded-xl rounded-tl-none p-2 shadow-sm w-[90%] self-start relative">
                    <div className="absolute top-0 -left-2 w-0 h-0 border-t-[0px] border-t-transparent border-r-[10px] border-r-white border-b-[10px] border-b-transparent"></div>
                    
                    {selectedTemplateToView.components?.find((c: any) => c.type === 'HEADER' && c.format === 'IMAGE') && (
                      <div className="w-full h-32 bg-gray-200 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed font-[system-ui]">
                      {(() => {
                        const bodyComp = selectedTemplateToView.components?.find((c: any) => c.type === 'BODY');
                        if (!bodyComp || !bodyComp.text) return '';
                        
                        let text = bodyComp.text;
                        const examples = bodyComp.example?.body_text?.[0];
                        
                        if (examples) {
                          return text.split(/(\{\{\d+\}\})/).map((part: string, i: number) => {
                            const match = part.match(/\{\{(\d+)\}\}/);
                            if (match) {
                              const numIndex = parseInt(match[1]) - 1;
                              const exampleValue = examples[numIndex] || part;
                              return <span key={i} className="bg-yellow-200 text-yellow-800 px-1 rounded mx-0.5 font-bold">{exampleValue}</span>;
                            }
                            return part;
                          });
                        }
                        
                        return text;
                      })()}
                    </p>
                    <div className="text-[10px] text-gray-400 text-right mt-1">Ahora mismo</div>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
