import { useState, useEffect } from 'react';
import { MessageCircle, ToggleRight, ToggleLeft, Plus, ShieldAlert, Trash2, RefreshCw, Loader2, Sparkles, CheckCircle2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Lista exhaustiva por defecto de groserías y acusaciones de estafa en Latinoamérica (CO, MX, AR, CL, PE, EC, VE, GT)
const LATAM_BAD_WORDS = [
  // Acusaciones de estafa / fraude / falsedad
  'estafa', 'estafas', 'estafadores', 'estafador', 'estafando', 'estafado', 'estafada',
  'fraude', 'fraudulento', 'fraudulenta', 'ladron', 'ladrón', 'ladrones', 'ladrona', 'rateros', 'ratero', 'ratas', 'rata', 'roban', 'robo', 'robos', 'robado',
  'mentira', 'mentiras', 'mentiroso', 'mentirosos', 'falso', 'falsos', 'falsa', 'falsas', 'fake', 'engaño', 'engano', 'engañar', 'enganan',
  'tranza', 'tranzas', 'usurero', 'usureros', 'timo', 'timadores', 'timador', 'pirata', 'replica', 'réplica', 'imitacion', 'imitación',
  'no compren', 'no pidan', 'no llega', 'nunca llego', 'nunca llegó', 'mala calidad', 'pésima calidad', 'pesima calidad', 'basura', 'porqueria', 'porquería',
  
  // Groserías e Insultos LATAM
  'puta', 'putas', 'putos', 'puto', 'hijueputa', 'hpta', 'hptas', 'jueputa', 'malparido', 'malparidos', 'malparida', 'gonorrea', 'gonorreas',
  'pendejo', 'pendejos', 'pendejada', 'chingada', 'chingadazo', 'verga', 'vergas', 'mierda', 'mierdas', 'basofia', 'porqueria',
  'boludo', 'boludos', 'pelotudo', 'pelotudos', 'chupala', 'concha', 'conchatumadre', 'ctm', 'chuchatumadre',
  'weon', 'huevon', 'huevón', 'weones', 'conchesumadre', 'maricon', 'maricón', 'maricones',
  'carechimba', 'chimba', 'pirobo', 'pirobox', 'mamaguevo', 'mamarre', 'descarados', 'descarado', 'ladronzuelos'
];

export function Comments() {
  const [pages, setPages] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [pageName, setPageName] = useState('');
  const [pageId, setPageId] = useState('');
  const [igAccountId, setIgAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Anti-Hater Keywords State
  const [badWords, setBadWords] = useState<string[]>(LATAM_BAD_WORDS);
  const [newBadWord, setNewBadWord] = useState('');
  const [showAllWords, setShowAllWords] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: pageData } = await (supabase.from('connected_pages') as any).select('*, stores(name)').order('created_at', { ascending: false });
      const { data: waNums } = await (supabase.from('whatsapp_numbers') as any).select('*');
      
      const enrichedPages = (pageData || []).map((p: any) => {
        const match = (waNums || []).find((w: any) => w.display_name === p.page_name || w.phone_number_id === p.page_id);
        return {
          ...p,
          business_manager: match?.business_manager || p.business_manager || 'Business Manager Oficial'
        };
      });
      setPages(enrichedPages);

      const { data: storeData } = await supabase.from('stores').select('id, name').order('name');
      setStores(storeData || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleAutoSync() {
    setSyncing(true);
    try {
      const { data: waNums } = await (supabase.from('whatsapp_numbers') as any).select('*');
      if (waNums && waNums.length > 0) {
        let imported = 0;
        for (const wa of (waNums as any[])) {
          const { data: existing } = await (supabase.from('connected_pages') as any).select('id').eq('page_name', wa.display_name).maybeSingle();
          if (!existing && wa.access_token) {
            await (supabase.from('connected_pages') as any).insert({
              page_name: wa.display_name || wa.business_manager || 'Fan Page',
              page_id: wa.phone_number_id,
              access_token: wa.access_token,
              store_id: wa.store_id,
              is_active: true
            });
            imported++;
          }
        }
        alert(`Sincronización completada. Se importaron ${imported} Fan Pages automáticamente.`);
        loadData();
      } else {
        alert('No se encontraron credenciales guardadas para sincronizar.');
      }
    } catch (e: any) {
      alert('Error en sincronización: ' + e.message);
    }
    setSyncing(false);
  }

  async function handleAddPage(e: React.FormEvent) {
    e.preventDefault();
    if (!pageName || !pageId || !accessToken) {
      alert('Por favor completa el nombre de la página, Page ID y el Access Token de Meta.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await (supabase.from('connected_pages') as any).insert({
        page_name: pageName,
        page_id: pageId,
        instagram_account_id: igAccountId || null,
        access_token: accessToken,
        store_id: selectedStoreId || null,
        is_active: true
      });

      if (error) throw error;

      alert('¡Fan Page / Cuenta de Instagram conectada con éxito!');
      setShowAddModal(false);
      setPageName('');
      setPageId('');
      setIgAccountId('');
      setAccessToken('');
      setSelectedStoreId('');
      loadData();
    } catch (e: any) {
      alert('Error guardando página: ' + e.message);
    }
    setSaving(false);
  }

  async function togglePageActive(page: any) {
    try {
      const newStatus = !page.is_active;
      await (supabase.from('connected_pages') as any).update({ is_active: newStatus }).eq('id', page.id);
      setPages(prev => prev.map(p => p.id === page.id ? { ...p, is_active: newStatus } : p));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleDeletePage(id: string) {
    if (!confirm('¿Estás seguro de desconectar esta Fan Page?')) return;
    try {
      await supabase.from('connected_pages').delete().eq('id', id);
      setPages(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  function handleAddBadWord() {
    if (!newBadWord.trim()) return;
    const word = newBadWord.trim().toLowerCase();
    if (!badWords.includes(word)) {
      setBadWords([word, ...badWords]);
    }
    setNewBadWord('');
  }

  function handleRemoveBadWord(word: string) {
    setBadWords(badWords.filter(w => w !== word));
  }

  const activePagesCount = pages.filter(p => p.is_active).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* ═══ HEADER PRINCIPAL CON BOTONES Y KPIs ═══ */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 sm:flex sm:items-center sm:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-3 border border-blue-400/30">
              <Sparkles className="w-3.5 h-3.5 text-blue-300" />
              <span>Moderación Inteligente Meta Graph API v2.0</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Asistente de Comentarios e Instagram DMs
            </h1>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              Eliminación automática de malos comentarios (Anti-Haters) en pautas, respuestas automáticas de precios y derivación de leads a WhatsApp en tiempo real.
            </p>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-wrap sm:flex-nowrap gap-3">
            <button 
              onClick={handleAutoSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 rounded-2xl bg-purple-600/90 hover:bg-purple-600 px-5 py-3 text-xs font-bold text-white shadow-lg hover:shadow-purple-500/25 transition-all backdrop-blur border border-purple-400/30"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Sincronizar Páginas
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-5 py-3 text-xs font-bold text-white shadow-lg hover:shadow-blue-500/30 transition-all border border-blue-400/30"
            >
              <Plus className="h-4 w-4" />
              Conectar Fan Page
            </button>
          </div>
        </div>

        {/* METRICAS KPI HEADER */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10 flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">Fan Pages Conectadas</p>
              <p className="text-2xl font-black text-white">{pages.length} <span className="text-xs font-normal text-gray-400">Páginas</span></p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">Moderación Activa</p>
              <p className="text-2xl font-black text-emerald-400">{activePagesCount} <span className="text-xs font-normal text-emerald-300/80">Protegidas</span></p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur rounded-2xl p-4 border border-white/10 flex items-center gap-4">
            <div className="p-3 bg-rose-500/20 rounded-xl text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-gray-400 text-xs font-medium">Filtro Anti-Haters LATAM</p>
              <p className="text-2xl font-black text-rose-400">{badWords.length} <span className="text-xs font-normal text-rose-300/80">Palabras clave</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ GRID DE FAN PAGES CONECTADAS ═══ */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>📱</span> Cuentas de Meta Conectadas ({pages.length})
          </h2>
          <span className="text-xs text-gray-500 font-medium">Muestra el Business Manager de origen de cada página</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            </div>
          ) : pages.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm">
              <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900">No hay Fan Pages conectadas</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                Haz clic en "Sincronizar Páginas" o "Conectar Fan Page" para vincular tus páginas de Meta.
              </p>
            </div>
          ) : (
            pages.map(page => (
              <div 
                key={page.id} 
                className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between relative overflow-hidden"
              >
                {/* Header Decorativo Superior */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                <div>
                  <div className="flex justify-between items-start mb-4 pt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 flex items-center justify-center shadow-inner">
                        <span className="text-sm font-black text-blue-700">
                          {page.instagram_account_id ? 'IG/FB' : 'FB'}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-gray-900 tracking-tight leading-snug">{page.page_name}</h3>
                        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1.5 mt-0.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${page.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></span>
                          <span className={page.is_active ? 'text-emerald-600 font-bold' : 'text-gray-400'}>
                            {page.is_active ? 'Moderación Activa' : 'Pausado'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => togglePageActive(page)} 
                      title={page.is_active ? 'Pausar Moderación' : 'Activar Moderación'}
                      className="transition-transform active:scale-95"
                    >
                      {page.is_active ? (
                        <ToggleRight className="h-9 w-9 text-blue-600 cursor-pointer hover:text-blue-700" />
                      ) : (
                        <ToggleLeft className="h-9 w-9 text-gray-300 cursor-pointer hover:text-gray-400" />
                      )}
                    </button>
                  </div>

                  {/* Ficha de Detalles de Meta */}
                  <div className="space-y-2.5 bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Propietario / Business Manager</span>
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
                        👤 {page.business_manager}
                      </span>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                      <span className="font-semibold text-gray-500">Page ID Meta:</span>
                      <span className="font-mono font-bold text-slate-800">{page.page_id}</span>
                    </div>

                    {page.instagram_account_id && (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-500">Instagram ID:</span>
                        <span className="font-mono font-bold text-pink-700">{page.instagram_account_id}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-1">
                      <span className="font-semibold text-gray-500">Tienda Destino:</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {page.stores?.name || 'Multitienda'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Token Conectado
                  </span>
                  <button 
                    onClick={() => handleDeletePage(page.id)}
                    className="text-red-500 hover:text-red-700 font-bold flex items-center gap-1 text-[11px] hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Desconectar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ═══ SECCIÓN FILTRO ANTI-HATERS (LATINOAMÉRICA) ═══ */}
      <div className="bg-gradient-to-b from-white to-red-50/40 rounded-3xl p-8 border border-red-200/80 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-600">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                <span>🛡️</span> Filtro Anti-Haters Latinoamérica
                <span className="bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full border border-red-200">
                  {badWords.length} Palabras Activas
                </span>
              </h2>
              <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                Cualquier comentario en Facebook o Instagram que contenga una de estas palabras ofensivas o acusaciones falsas será **borrado inmediatamente** por la API de Chatify antes de que afecte la conversión de tus anuncios.
              </p>
            </div>
          </div>
        </div>

        {/* Input para agregar palabras personalizadas */}
        <div className="flex gap-2 mb-6 max-w-xl">
          <input 
            type="text" 
            value={newBadWord}
            onChange={e => setNewBadWord(e.target.value)}
            placeholder="Agregar palabra u ofensa personalizada (ej. ladronzuelos)..."
            className="flex-1 rounded-2xl border-gray-300 text-sm px-4 py-3 focus:ring-red-500 focus:border-red-500 border shadow-sm"
            onKeyDown={e => e.key === 'Enter' && handleAddBadWord()}
          />
          <button 
            onClick={handleAddBadWord}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-3 rounded-2xl transition-all shadow-md hover:shadow-red-500/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Agregar
          </button>
        </div>

        {/* Badge Tags con Toggle Ver Más */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-5 border border-red-100 shadow-inner">
          <div className="flex flex-wrap gap-2">
            {(showAllWords ? badWords : badWords.slice(0, 20)).map(word => (
              <span 
                key={word} 
                className="inline-flex items-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors shadow-xs"
              >
                {word}
                <button 
                  onClick={() => handleRemoveBadWord(word)} 
                  className="text-red-400 hover:text-red-700 font-black ml-1 text-sm"
                  title="Eliminar de la lista"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {badWords.length > 20 && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">
                {showAllWords ? `Mostrando las ${badWords.length} palabras clave en memoria` : `Mostrando 20 de ${badWords.length} palabras clave cargadas por defecto para CO, MX, AR, CL, PE, EC, VE, GT`}
              </span>
              <button 
                onClick={() => setShowAllWords(!showAllWords)}
                className="text-red-600 hover:text-red-800 font-extrabold flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition-all"
              >
                {showAllWords ? (
                  <>Ver Menos <ChevronUp className="w-4 h-4" /></>
                ) : (
                  <>Ver Todas ({badWords.length}) <ChevronDown className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ MODAL CONECTAR NUEVA FAN PAGE ═══ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Conectar Fan Page / Instagram
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleAddPage} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre de la Fan Page</label>
                <input 
                  type="text" 
                  value={pageName} 
                  onChange={e => setPageName(e.target.value)} 
                  placeholder="Ej. UwaShop Colombia"
                  className="w-full text-sm rounded-xl border border-gray-300 p-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Page ID de Facebook</label>
                <input 
                  type="text" 
                  value={pageId} 
                  onChange={e => setPageId(e.target.value)} 
                  placeholder="Ej. 240543465799764"
                  className="w-full text-sm rounded-xl border border-gray-300 p-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Instagram Business Account ID (Opcional)</label>
                <input 
                  type="text" 
                  value={igAccountId} 
                  onChange={e => setIgAccountId(e.target.value)} 
                  placeholder="Ej. 178414000000000"
                  className="w-full text-sm rounded-xl border border-gray-300 p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Page Access Token de Meta Graph API</label>
                <textarea 
                  value={accessToken} 
                  onChange={e => setAccessToken(e.target.value)} 
                  placeholder="Pegar el Page Access Token generado en Meta Developers..."
                  rows={3}
                  className="w-full text-xs rounded-xl border border-gray-300 p-2.5 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Asignar Tienda (Opcional)</label>
                <select 
                  value={selectedStoreId} 
                  onChange={e => setSelectedStoreId(e.target.value)}
                  className="w-full text-sm rounded-xl border border-gray-300 p-2.5"
                >
                  <option value="">Multitienda (Compartida entre varias tiendas)</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-500 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar Conexión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


