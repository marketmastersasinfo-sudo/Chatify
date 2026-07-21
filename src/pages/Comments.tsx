import { useState, useEffect } from 'react';
import { MessageCircle, Settings, ToggleRight, ToggleLeft, Plus, ShieldAlert, Trash2, CheckCircle2, Store, RefreshCw, Loader2, Link as LinkIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Comments() {
  const [pages, setPages] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
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
  const [badWords, setBadWords] = useState<string[]>([
    'estafa', 'fraude', 'ladrón', 'ladrones', 'puta', 'mierda', 'estafadores', 'robo', 'basura', 'malo', 'mala', 'pésimo', 'pesimo', 'horrible', 'asco'
  ]);
  const [newBadWord, setNewBadWord] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const { data: pageData } = await supabase.from('connected_pages').select('*, stores(name)').order('created_at', { ascending: false });
      setPages(pageData || []);

      const { data: storeData } = await supabase.from('stores').select('id, name').order('name');
      setStores(storeData || []);

      const { data: prodData } = await supabase.from('products').select('id, name, ad_hashtag, price').order('name');
      setProducts(prodData || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  async function handleAutoSync() {
    setSyncing(true);
    try {
      const { data: waNums } = await supabase.from('whatsapp_numbers').select('*');
      if (waNums && waNums.length > 0) {
        let imported = 0;
        for (const wa of waNums) {
          const { data: existing } = await supabase.from('connected_pages').select('id').eq('page_name', wa.display_name).maybeSingle();
          if (!existing && wa.access_token) {
            await supabase.from('connected_pages').insert({
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
      const { error } = await supabase.from('connected_pages').insert({
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
      await supabase.from('connected_pages').update({ is_active: newStatus }).eq('id', page.id);
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
      setBadWords([...badWords, word]);
    }
    setNewBadWord('');
  }

  function handleRemoveBadWord(word: string) {
    setBadWords(badWords.filter(w => w !== word));
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Asistente Global de Comentarios e Instagram DMs</h1>
          <p className="mt-2 text-sm text-gray-500">
            Conecta tus Fan Pages de Facebook e Instagram para que la IA elimine malos comentarios (Haters), responda preguntas con precios oficiales y envíe DMs automáticos.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-3">
          <button 
            onClick={handleAutoSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-purple-500 transition-all"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Sincronizar Fan Pages Guardadas
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-blue-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Conectar Nueva Fan Page
          </button>
        </div>
      </div>

      {/* Grid de Páginas Conectadas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : pages.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-8 text-center border border-gray-200">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900">No hay Fan Pages conectadas</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              Haz clic en "Conectar Fan Page / Instagram" para vincular tus cuentas de Meta y activar la respuesta por IA y moderación anti-haters.
            </p>
          </div>
        ) : (
          pages.map(page => (
            <div key={page.id} className="glass-card rounded-2xl p-6 border-t-4 border-t-blue-600 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <span className="text-xl font-bold text-blue-600">
                        {page.instagram_account_id ? 'IG/FB' : 'FB'}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">{page.page_name}</h2>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${page.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {page.is_active ? 'Moderación Activa' : 'Pausado'}
                      </p>
                    </div>
                  </div>

                  <button onClick={() => togglePageActive(page)} title="Activar / Desactivar">
                    {page.is_active ? (
                      <ToggleRight className="h-8 w-8 text-blue-600 cursor-pointer" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-gray-400 cursor-pointer" />
                    )}
                  </button>
                </div>

                <div className="space-y-3 bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs text-gray-600">
                  <p className="flex justify-between">
                    <span className="font-semibold text-gray-500">Page ID:</span>
                    <span className="font-mono text-gray-900">{page.page_id}</span>
                  </p>
                  {page.instagram_account_id && (
                    <p className="flex justify-between">
                      <span className="font-semibold text-gray-500">Instagram ID:</span>
                      <span className="font-mono text-gray-900">{page.instagram_account_id}</span>
                    </p>
                  )}
                  <p className="flex justify-between">
                    <span className="font-semibold text-gray-500">Tienda Asignada:</span>
                    <span className="font-semibold text-blue-600">
                      {page.stores?.name || 'Multitienda (Compartida)'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                <span className="text-gray-400">Token válido</span>
                <button 
                  onClick={() => handleDeletePage(page.id)}
                  className="text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Desconectar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Sección Filtro Anti-Haters */}
      <div className="glass-card rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-red-50 rounded-xl">
            <ShieldAlert className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Filtro Anti-Haters (Eliminación Automática de Comentarios)</h2>
            <p className="text-xs text-gray-500">
              Cualquier comentario en tus anuncios que contenga estas palabras será borrado de inmediato de Facebook e Instagram para proteger tu reputación y conversión.
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <input 
            type="text" 
            value={newBadWord}
            onChange={e => setNewBadWord(e.target.value)}
            placeholder="Agregar palabra ofensiva (ej. estafadores)..."
            className="flex-1 rounded-xl border-gray-300 text-sm px-4 py-2 focus:ring-red-500 focus:border-red-500 border"
            onKeyDown={e => e.key === 'Enter' && handleAddBadWord()}
          />
          <button 
            onClick={handleAddBadWord}
            className="bg-red-600 hover:bg-red-500 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-all"
          >
            Agregar Palabra
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {badWords.map(word => (
            <span key={word} className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-lg">
              {word}
              <button onClick={() => handleRemoveBadWord(word)} className="text-red-400 hover:text-red-600">
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Modal Conectar Fan Page */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" /> Conectar Fan Page / Instagram
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
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
                <p className="text-[11px] text-gray-500 mt-1">
                  Si dejas "Multitienda", la tienda del cliente se deducirá automáticamente según el producto del anuncio.
                </p>
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

