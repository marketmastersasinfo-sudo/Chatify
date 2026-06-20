import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Music, Loader2, Save, Trash2, Copy, Store, Plus, ArrowUp, ArrowDown, Gift, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';

export function Products() {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor State
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form Fields
  const [name, setName] = useState('');
  const [price, setPrice] = useState(''); // Legacy base price, still good to have
  
  // New State: Offers
  const [offers, setOffers] = useState<{ id: string, title: string, price: string, gift: string, isUpsell: boolean }[]>([]);
  
  // New State: Phases
  const [phases, setPhases] = useState({
    greeting: '',
    pitch: '',
    objections: '',
    closing: ''
  });

  const [mediaAssets, setMediaAssets] = useState<{ tag: string, url: string, type: string }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadProducts(selectedStore.id);
    } else {
      setProducts([]);
    }
  }, [selectedStore]);

  async function loadStores() {
    setLoading(true);
    try {
      let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      if (orgs && orgs.length > 0) {
        const { data: allStores } = await supabase
          .from('stores')
          .select('*')
          .eq('organization_id', (orgs as any[])[0].id)
          .order('name');
        
        if (allStores && allStores.length > 0) {
          setStores(allStores);
          setSelectedStore(allStores[0]);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function loadProducts(storeId: string) {
    try {
      const { data } = await supabase.from('products').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      setProducts(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  function handleAddClick() {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setOffers([]);
    setPhases({ greeting: '', pitch: '', objections: '', closing: '' });
    setMediaAssets([]);
    setIsAdding(true);
  }

  function handleEditClick(prod: any) {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price.toString());
    
    try {
      const parsed = JSON.parse(prod.master_prompt);
      if (parsed.builderData) {
        setOffers(parsed.builderData.offers || []);
        setPhases(parsed.builderData.phases || { greeting: '', pitch: '', objections: '', closing: '' });
      } else {
        // Legacy raw prompt -> put in greeting
        setPhases({ greeting: parsed.whatsapp || prod.master_prompt || '', pitch: '', objections: '', closing: '' });
        setOffers([]);
      }
    } catch {
      setPhases({ greeting: prod.master_prompt || '', pitch: '', objections: '', closing: '' });
      setOffers([]);
    }

    let parsedMedia = [];
    try {
      if (prod.media_assets) parsedMedia = JSON.parse(prod.media_assets);
    } catch {}
    setMediaAssets(Array.isArray(parsedMedia) ? parsedMedia : []);
    
    setIsAdding(true);
  }

  function compilePromptWa() {
    let prompt = `ERES UN VENDEDOR ESTRELLA.\nOBJETIVO: Vender el producto ${name}.\nTONO: Amable, cercano y persuasivo, usando emojis.\n\n`;
    
    if (offers.length > 0) {
      prompt += `== OFERTAS DISPONIBLES ==\n`;
      offers.filter(o => !o.isUpsell).forEach(o => {
        prompt += `- ${o.title}: $${o.price} ${o.gift ? '(Incluye: ' + o.gift + ')' : ''}\n`;
      });
      const upsells = offers.filter(o => o.isUpsell);
      if (upsells.length > 0) {
        prompt += `\n== UPSELLS (Ofrecer SOLO DESPUÉS de que el cliente acepte comprar o esté muy interesado) ==\n`;
        upsells.forEach(o => {
          prompt += `- ${o.title}: $${o.price} ${o.gift ? '(Incluye: ' + o.gift + ')' : ''}\n`;
        });
      }
      prompt += `\n`;
    }

    prompt += `== FASES DEL EMBUDO (Sigue este orden en la conversación) ==\n`;
    if (phases.greeting) prompt += `1. APERTURA:\n${phases.greeting}\n\n`;
    if (phases.pitch) prompt += `2. PRESENTACIÓN DE OFERTA:\n${phases.pitch}\n\n`;
    if (phases.objections) prompt += `3. MANEJO DE OBJECIONES:\n${phases.objections}\n\n`;
    if (phases.closing) prompt += `4. CIERRE Y DATOS:\n${phases.closing}\n\n`;

    return prompt;
  }

  async function handleSave() {
    if (!name || !price || !selectedStore) return;
    setSaving(true);
    try {
      const whatsappCompiled = compilePromptWa();
      const master_prompt = JSON.stringify({ 
        whatsapp: whatsappCompiled, 
        social: '',
        builderData: {
          offers,
          phases
        }
      });
      const mediaAssetsStr = JSON.stringify(mediaAssets);
      
      if (editingProduct) {
        const { data, error } = await (supabase as any).from('products').update({
          name,
          price: parseFloat(price),
          master_prompt,
          media_assets: mediaAssetsStr
        }).eq('id', editingProduct.id).select().single();
        
        if (data && !error) {
          setProducts(products.map(p => p.id === data.id ? data : p));
          setIsAdding(false);
        }
      } else {
        const { data, error } = await (supabase as any).from('products').insert({
          store_id: selectedStore.id,
          name,
          price: parseFloat(price),
          master_prompt,
          media_assets: mediaAssetsStr
        }).select().single();
        
        if (data && !error) {
          setProducts([data, ...products]);
          setIsAdding(false);
        }
      }
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingMedia(true);
    try {
      const newAssets: { tag: string, url: string, type: string }[] = [];
      let currentIndex = mediaAssets.length;

      for (const file of files) {
        let finalFile: File | Blob = file;
        const isImage = file.type.startsWith('image/');
        
        // Compress image
        if (isImage) {
          const options = {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true
          };
          finalFile = await imageCompression(file, options);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data, error } = await supabase.storage
          .from('chatify_media')
          .upload(fileName, finalFile, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage.from('chatify_media').getPublicUrl(data.path);
        
        currentIndex++;
        const newTag = `[MEDIA_${currentIndex}]`;
        newAssets.push({
          tag: newTag,
          url: publicUrl,
          type: isImage ? 'image' : 'audio'
        });
      }

      setMediaAssets(prev => [...prev, ...newAssets]);
    } catch (err) {
      console.error('Error uploading:', err);
      alert('Error subiendo uno o más archivos. Asegúrate de haber creado el bucket "chatify_media".');
    }
    setUploadingMedia(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removeMedia(index: number) {
    const newAssets = [...mediaAssets];
    newAssets.splice(index, 1);
    const retagged = newAssets.map((a, i) => ({ ...a, tag: `[MEDIA_${i + 1}]` }));
    setMediaAssets(retagged);
  }

  function moveMedia(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === mediaAssets.length - 1) return;
    
    const newAssets = [...mediaAssets];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap
    [newAssets[index], newAssets[swapIndex]] = [newAssets[swapIndex], newAssets[index]];
    
    // Retag
    const retagged = newAssets.map((a, i) => ({ ...a, tag: `[MEDIA_${i + 1}]` }));
    setMediaAssets(retagged);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Embudos de Productos</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Diseña la estrategia de ventas perfecta para la Inteligencia Artificial.
          </p>
        </div>
        
        {!isAdding && (
          <div className="mt-4 flex items-center gap-4 sm:ml-16 sm:mt-0">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Store className="h-4 w-4 text-gray-400" />
              </div>
              <select
                value={selectedStore?.id || ''}
                onChange={(e) => {
                  const s = stores.find(x => x.id === e.target.value);
                  if (s) setSelectedStore(s);
                }}
                className="block w-full rounded-md border-0 py-1.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleAddClick}
              disabled={!selectedStore}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </button>
          </div>
        )}
      </div>

      {!isAdding ? (
        <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-white sm:pl-6">Nombre del Producto</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Precio Base</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Multimedia</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Editar</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">No hay embudos construidos en esta tienda.</td></tr>
              ) : (
                products.map((p) => {
                  let assets = [];
                  try { if (p.media_assets) assets = JSON.parse(p.media_assets); } catch {}
                  return (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{p.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">${p.price}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {assets.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full">
                            <ImageIcon className="w-3 h-3" /> {assets.length} archivos
                          </span>
                        ) : 'Sin archivos'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => handleEditClick(p)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400">Constructor Visual</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-800 px-4 py-5 sm:px-6 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-white">
              {editingProduct ? 'Constructor de Embudo' : 'Nuevo Embudo'}
            </h3>
            <div className="flex gap-3">
              <button onClick={() => setIsAdding(false)} className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-700">
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Embudo
              </button>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-8">
            
            {/* Columna Izquierda: Detalles y Ofertas */}
            <div className="xl:col-span-1 space-y-8">
              {/* Bloque 1: Info Base */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Store className="w-4 h-4 text-blue-500" />
                  Información Base
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Palabra Clave (Producto)</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Jogger Hombre Variable" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-900 dark:ring-gray-700 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Precio Referencia</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="99000" className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-900 dark:ring-gray-700 dark:text-white" />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Ofertas Dinámicas */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Gift className="w-4 h-4 text-green-500" />
                    Combos y Upsells
                  </h4>
                  <button 
                    onClick={() => setOffers([...offers, { id: Math.random().toString(), title: '', price: '', gift: '', isUpsell: false }])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Agregar
                  </button>
                </div>
                
                <div className="space-y-4">
                  {offers.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-2">No has agregado combos. Se usará el precio de referencia.</p>
                  )}
                  {offers.map((offer, idx) => (
                    <div key={offer.id} className={`p-3 rounded-lg border ${offer.isUpsell ? 'border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800' : 'border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-700'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Oferta #{idx + 1}</span>
                        <button onClick={() => setOffers(offers.filter(o => o.id !== offer.id))} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={offer.title} onChange={e => { const no = [...offers]; no[idx].title = e.target.value; setOffers(no); }} placeholder="Título (Ej. 3x Joggers)" className="block w-full rounded-md border-0 py-1 px-2 text-xs text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" />
                          <input type="text" value={offer.price} onChange={e => { const no = [...offers]; no[idx].price = e.target.value; setOffers(no); }} placeholder="Precio (Ej. 99000)" className="block w-full rounded-md border-0 py-1 px-2 text-xs text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" />
                        </div>
                        <input type="text" value={offer.gift} onChange={e => { const no = [...offers]; no[idx].gift = e.target.value; setOffers(no); }} placeholder="Regalo/Bono (Opcional)" className="block w-full rounded-md border-0 py-1 px-2 text-xs text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" />
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input type="checkbox" checked={offer.isUpsell} onChange={e => { const no = [...offers]; no[idx].isUpsell = e.target.checked; setOffers(no); }} className="rounded border-gray-300 text-purple-600 focus:ring-purple-600" />
                          <span className="text-xs text-gray-600 dark:text-gray-400">Es un Upsell secreto (Se ofrece al cierre)</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bloque 3: Multimedia (Con miniaturas y reordenamiento) */}
              <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-orange-500" />
                  Archivos Multimedia
                </h4>
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*, audio/mp3, audio/ogg, audio/mpeg" multiple onChange={handleFileUpload} />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="w-full py-2 mb-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex justify-center items-center gap-2 dark:text-gray-400"
                >
                  {uploadingMedia ? <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo...</> : <><Plus className="w-4 h-4" /> Seleccionar Fotos/Audios</>}
                </button>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {mediaAssets.map((asset, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg group hover:border-blue-300 transition-colors">
                      {/* Thumbnail */}
                      <div className="w-12 h-12 flex-shrink-0 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden flex items-center justify-center border border-gray-200 dark:border-gray-700">
                        {asset.type === 'image' ? (
                          <img src={asset.url} alt="thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-5 h-5 text-purple-500" />
                        )}
                      </div>
                      
                      {/* Info & Tag */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 dark:text-white font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">
                            {asset.tag}
                          </span>
                          <button onClick={() => copyToClipboard(asset.tag)} className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Copiar Tag"><Copy className="w-3 h-3" /></button>
                        </div>
                      </div>

                      {/* Controls */}
                      <div className="flex flex-col gap-1 items-center">
                        <div className="flex gap-1">
                          <button onClick={() => moveMedia(idx, 'up')} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30"><ArrowUp className="w-3 h-3" /></button>
                          <button onClick={() => moveMedia(idx, 'down')} disabled={idx === mediaAssets.length - 1} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30"><ArrowDown className="w-3 h-3" /></button>
                        </div>
                        <button onClick={() => removeMedia(idx)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                  {mediaAssets.length === 0 && <p className="text-xs text-center text-gray-500">No hay multimedia.</p>}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Constructor de Fases (Embudo) */}
            <div className="xl:col-span-2">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
                <div className="border-b border-gray-200 dark:border-gray-800 px-5 py-4 bg-gray-50 dark:bg-gray-800/30">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    Fases de Conversión (Embudo)
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Escribe qué debe decir la IA en cada etapa. Pega las etiquetas <code>[MEDIA_X]</code> donde quieras enviar fotos.
                  </p>
                </div>

                <div className="p-5 space-y-6">
                  {/* Fase 1: Apertura */}
                  <div className="relative pl-6 border-l-2 border-blue-500 pb-2">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white dark:ring-gray-900"></div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">1. Saludo y Enganche</label>
                    <textarea 
                      rows={3}
                      value={phases.greeting}
                      onChange={e => setPhases({...phases, greeting: e.target.value})}
                      className="block w-full rounded-md border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
                      placeholder="Ej: ¡Hola bro! Qué excelente gusto, los Joggers están increíbles. Mira esta foto: [MEDIA_1]"
                    />
                  </div>

                  {/* Fase 2: Pitch */}
                  <div className="relative pl-6 border-l-2 border-green-500 pb-2">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-green-500 ring-4 ring-white dark:ring-gray-900"></div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">2. Pitch de Ventas (Ofertas y Beneficios)</label>
                    <textarea 
                      rows={4}
                      value={phases.pitch}
                      onChange={e => setPhases({...phases, pitch: e.target.value})}
                      className="block w-full rounded-md border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
                      placeholder="Ej: Te cuento que la tela es stretch. Hoy tenemos promoción con envío gratis, puedes llevar 1 o 3 unidades. ¿Cuál te gusta más?"
                    />
                  </div>

                  {/* Fase 3: Objeciones */}
                  <div className="relative pl-6 border-l-2 border-orange-500 pb-2">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-orange-500 ring-4 ring-white dark:ring-gray-900"></div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">3. Manejo de Objeciones</label>
                    <textarea 
                      rows={3}
                      value={phases.objections}
                      onChange={e => setPhases({...phases, objections: e.target.value})}
                      className="block w-full rounded-md border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
                      placeholder="Ej: Si te dicen que está caro, envíales este audio explicándoles la garantía: [MEDIA_2]. Si desconfían, diles que es pago contraentrega."
                    />
                  </div>

                  {/* Fase 4: Cierre */}
                  <div className="relative pl-6 border-l-2 border-transparent">
                    <div className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-white dark:ring-gray-900"></div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-2">4. Cierre y Recolección de Datos</label>
                    <textarea 
                      rows={3}
                      value={phases.closing}
                      onChange={e => setPhases({...phases, closing: e.target.value})}
                      className="block w-full rounded-md border-0 py-2 px-3 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 dark:bg-gray-800 dark:ring-gray-700 dark:text-white"
                      placeholder="Ej: Perfecto, para generar tu guía de envío gratis necesito tu ciudad y dirección. ¡Apenas me los des, lanzas el Upsell secreto si configuré alguno!"
                    />
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
