import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Music, Loader2, Save, Trash2, Copy, Store, Plus, ArrowUp, ArrowDown, Gift, BrainCircuit, ChevronLeft } from 'lucide-react';
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
  const [price, setPrice] = useState(''); 
  
  // Offers
  const [offers, setOffers] = useState<{ id: string, title: string, price: string, gift: string, isUpsell: boolean }[]>([]);
  
  // Single Custom Prompt
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Flow Templates
  const [flowTemplates, setFlowTemplates] = useState<any[]>([]);
  const [selectedFlowTemplateId, setSelectedFlowTemplateId] = useState<string>('');

  const [mediaAssets, setMediaAssets] = useState<{ tag: string, url: string, type: string, rule?: string }[]>([]);
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
        const orgId = (orgs as any[])[0].id;
        const { data: allStores } = await supabase
          .from('stores')
          .select('*')
          .eq('organization_id', orgId)
          .order('name');
        
        if (allStores && allStores.length > 0) {
          setStores(allStores);
          setSelectedStore(allStores[0]);
        }

        const { data: templates } = await supabase
          .from('flow_templates')
          .select('id, name')
          .eq('organization_id', orgId)
          .order('name');
        if (templates) setFlowTemplates(templates);
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
    setCustomPrompt('');
    setSelectedFlowTemplateId('');
    setMediaAssets([]);
    setIsAdding(true);
  }

  function handleEditClick(prod: any) {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price.toString());
    setSelectedFlowTemplateId(prod.flow_template_id || '');
    
    try {
      const parsed = JSON.parse(prod.master_prompt);
      if (parsed.builderData) {
        setOffers(parsed.builderData.offers || []);
        
        if (parsed.builderData.customPrompt !== undefined) {
          setCustomPrompt(parsed.builderData.customPrompt);
        } else if (parsed.builderData.phases) {
          const { greeting, pitch, objections, closing } = parsed.builderData.phases;
          const combined = [greeting, pitch, objections, closing].filter(Boolean).join('\n\n');
          setCustomPrompt(combined);
        }
      } else {
        setCustomPrompt(parsed.whatsapp || prod.master_prompt || '');
        setOffers([]);
      }
    } catch {
      setCustomPrompt(prod.master_prompt || '');
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
    let prompt = '';
    
    if (offers.length > 0) {
      prompt += `== CONTEXTO DEL SISTEMA: OFERTAS DISPONIBLES ==\n`;
      prompt += `Usa obligatoriamente los siguientes precios y ofertas para este producto:\n`;
      offers.filter(o => !o.isUpsell).forEach(o => {
        prompt += `- ${o.title}: $${o.price} ${o.gift ? '(Bono/Regalo: ' + o.gift + ')' : ''}\n`;
      });
      const upsells = offers.filter(o => o.isUpsell);
      if (upsells.length > 0) {
        prompt += `\n== UPSELLS SECRETOS ==\n`;
        prompt += `(Ofrecer SOLO DESPUÉS de que el cliente haya aceptado comprar la oferta principal)\n`;
        upsells.forEach(o => {
          prompt += `- ${o.title}: $${o.price} ${o.gift ? '(Bono/Regalo: ' + o.gift + ')' : ''}\n`;
        });
      }
      prompt += `\n==============================================\n\n`;
    }

    prompt += `== INSTRUCCIONES DEL VENDEDOR (TU COMPORTAMIENTO) ==\n`;
    prompt += customPrompt;

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
          customPrompt
        }
      });
      
      const updateData: any = {
        name,
        price: parseFloat(price) || 0,
        offers: JSON.stringify(offers),
        master_prompt: master_prompt,
        flow_template_id: selectedFlowTemplateId || null,
        media_assets: JSON.stringify(mediaAssets)
      };
      
      if (editingProduct) {
        const { data, error } = await (supabase as any).from('products').update(updateData).eq('id', editingProduct.id).select().single();
        
        if (data && !error) {
          setProducts(products.map(p => p.id === data.id ? data : p));
          setIsAdding(false);
        }
      } else {
        const { data, error } = await (supabase as any).from('products').insert({
          store_id: selectedStore.id,
          ...updateData
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
    
    [newAssets[index], newAssets[swapIndex]] = [newAssets[swapIndex], newAssets[index]];
    
    const retagged = newAssets.map((a, i) => ({ ...a, tag: `[MEDIA_${i + 1}]` }));
    setMediaAssets(retagged);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function updateMediaRule(index: number, rule: string) {
    const newAssets = [...mediaAssets];
    newAssets[index].rule = rule;
    setMediaAssets(newAssets);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Catálogo de Productos</h1>
          <p className="mt-2 text-sm text-slate-500">
            Diseña la estrategia de ventas perfecta para que la Inteligencia Artificial convierta más.
          </p>
        </div>
        
        {!isAdding && (
          <div className="mt-4 flex items-center gap-4 sm:ml-16 sm:mt-0">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Store className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={selectedStore?.id || ''}
                onChange={(e) => {
                  const s = stores.find(x => x.id === e.target.value);
                  if (s) setSelectedStore(s);
                }}
                className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-10 text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white shadow-sm font-medium cursor-pointer"
              >
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.country})</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleAddClick}
              disabled={!selectedStore}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </button>
          </div>
        )}
      </div>

      {!isAdding ? (
        <div className="bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-2xl overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="py-4 pl-6 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre del Producto</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio Base</th>
                <th scope="col" className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Multimedia</th>
                <th scope="col" className="relative py-4 pl-3 pr-6"><span className="sr-only">Editar</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr><td colSpan={4} className="py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center text-slate-500 bg-slate-50/50 font-medium">No hay productos construidos en esta tienda.</td></tr>
              ) : (
                products.map((p) => {
                  let assets = [];
                  try { if (p.media_assets) assets = JSON.parse(p.media_assets); } catch {}
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-semibold text-slate-900">{p.name}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-slate-600">${p.price}</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {assets.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                            <ImageIcon className="w-3.5 h-3.5" /> {assets.length} archivos
                          </span>
                        ) : <span className="text-slate-400 italic text-xs">Sin archivos</span>}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                        <button onClick={() => handleEditClick(p)} className="text-indigo-600 hover:text-indigo-900 font-semibold transition-colors">Configurar Embudo &rarr;</button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-200 sm:rounded-3xl overflow-hidden">
          {/* Cabecera del Editor */}
          <div className="border-b border-slate-100 px-6 py-5 flex justify-between items-center bg-white sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsAdding(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Configuración Premium del Producto' : 'Crear Nuevo Producto'}
              </h3>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-500 hover:shadow-lg disabled:opacity-50 transition-all duration-200"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Cambios
              </button>
            </div>
          </div>
          
          <div className="p-8 grid grid-cols-1 xl:grid-cols-12 gap-8 bg-slate-50/50">
            
            {/* Columna Izquierda: Detalles y Ofertas */}
            <div className="xl:col-span-4 space-y-6">
              
              {/* Bloque 1: Info Base */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <h4 className="text-sm font-bold text-slate-900 mb-5 flex items-center gap-2 uppercase tracking-wider">
                  <Store className="w-4 h-4 text-indigo-500" />
                  Información Base
                </h4>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Palabra Clave (Producto)</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Jogger Hombre Variable" className="block w-full rounded-xl border-slate-200 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-medium transition-colors" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Precio Base Referencia</label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-slate-400 font-medium">$</span>
                      </div>
                      <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="99000" className="block w-full rounded-xl border-slate-200 py-2.5 pl-8 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-medium transition-colors" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bloque 2: Ofertas Dinámicas */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                    <Gift className="w-4 h-4 text-emerald-500" />
                    Combos y Upsells
                  </h4>
                  <button 
                    onClick={() => setOffers([...offers, { id: Math.random().toString(), title: '', price: '', gift: '', isUpsell: false }])}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Agregar
                  </button>
                </div>
                
                <div className="space-y-4">
                  {offers.length === 0 && (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-500 font-medium">No has agregado combos. La IA usará el precio base.</p>
                    </div>
                  )}
                  {offers.map((offer, idx) => (
                    <div key={offer.id} className={`p-4 rounded-xl border-2 transition-all ${offer.isUpsell ? 'border-purple-100 bg-purple-50/50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <span className={`text-xs font-extrabold uppercase tracking-wider ${offer.isUpsell ? 'text-purple-600' : 'text-slate-500'}`}>
                          {offer.isUpsell ? '⭐ Upsell' : `Oferta #${idx + 1}`}
                        </span>
                        <button onClick={() => setOffers(offers.filter(o => o.id !== offer.id))} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <input type="text" value={offer.title} onChange={e => { const no = [...offers]; no[idx].title = e.target.value; setOffers(no); }} placeholder="Título (Ej. 3x Joggers)" className="block w-full rounded-lg border-slate-200 py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium" />
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
                              <span className="text-slate-400 text-sm font-medium">$</span>
                            </div>
                            <input type="number" value={offer.price} onChange={e => { const no = [...offers]; no[idx].price = e.target.value; setOffers(no); }} placeholder="99000" className="block w-full rounded-lg border-slate-200 py-2 pl-6 pr-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-medium" />
                          </div>
                        </div>
                        <input type="text" value={offer.gift} onChange={e => { const no = [...offers]; no[idx].gift = e.target.value; setOffers(no); }} placeholder="🎁 Bono/Regalo (Opcional)" className="block w-full rounded-lg border-slate-200 py-2 px-3 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-slate-50 font-medium" />
                        <label className="flex items-center gap-2.5 pt-1 cursor-pointer group">
                          <input type="checkbox" checked={offer.isUpsell} onChange={e => { const no = [...offers]; no[idx].isUpsell = e.target.checked; setOffers(no); }} className="w-4 h-4 rounded text-purple-600 focus:ring-purple-600 border-slate-300 cursor-pointer" />
                          <span className="text-xs font-semibold text-slate-600 group-hover:text-purple-700 transition-colors">Marcar como Upsell (ofrecer al final)</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Columna Derecha: Prompt y Multimedia */}
            <div className="xl:col-span-8 flex flex-col gap-6">
              
              {/* Bloque: Prompt Maestro */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden h-[500px]">
                <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/50">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                    <BrainCircuit className="w-4 h-4 text-indigo-500" />
                    Reglas Base y Flujo
                  </h4>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-medium">
                    Escribe aquí la personalidad del bot o selecciona un <strong>Embudo Global</strong> para que aplique la secuencia de ventas automáticamente.
                  </p>
                </div>

                <div className="p-4 border-b border-slate-100 bg-slate-50/30">
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Plantilla de Embudo (Opcional)</label>
                  <select
                    value={selectedFlowTemplateId}
                    onChange={(e) => setSelectedFlowTemplateId(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-medium transition-colors cursor-pointer bg-white"
                  >
                    <option value="">-- Sin Embudo (Solo usar Reglas Base) --</option>
                    {flowTemplates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                    ))}
                  </select>
                </div>

                <div className="p-0 flex-1">
                  <textarea 
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    className="block w-full h-full border-0 py-6 px-6 text-sm text-slate-700 focus:ring-0 resize-none font-mono leading-relaxed bg-white"
                    placeholder="Reglas base, personalidad o preguntas frecuentes (FAQ)..."
                  />
                </div>
              </div>

              {/* Bloque: Multimedia Horizontal */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-5">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                    <ImageIcon className="w-4 h-4 text-orange-500" />
                    Archivos Multimedia
                  </h4>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingMedia}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {uploadingMedia ? <><Loader2 className="w-3 h-3 animate-spin" /> Subiendo...</> : <><Plus className="w-3 h-3" /> Subir Fotos/Audios</>}
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*, audio/mp3, audio/ogg, audio/mpeg" multiple onChange={handleFileUpload} />
                </div>
                
                <div className="flex overflow-x-auto gap-4 pb-2 snap-x">
                  {mediaAssets.map((asset, idx) => (
                    <div key={idx} className="flex-shrink-0 w-48 bg-white border border-slate-200 rounded-xl overflow-hidden group hover:border-indigo-300 hover:shadow-md transition-all snap-start">
                      {/* Thumbnail Area */}
                      <div className="h-32 bg-slate-100 flex items-center justify-center relative group-hover:opacity-90 transition-opacity">
                        {asset.type === 'image' ? (
                          <img src={asset.url} alt="thumbnail" className="w-full h-full object-cover" />
                        ) : (
                          <Music className="w-8 h-8 text-indigo-400" />
                        )}
                        {/* Overlay Controls */}
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
                          <button onClick={() => moveMedia(idx, 'up')} disabled={idx === 0} className="p-2 bg-white/90 rounded-full hover:bg-white text-slate-700 disabled:opacity-50 transition-colors shadow-sm"><ArrowUp className="w-4 h-4" /></button>
                          <button onClick={() => removeMedia(idx)} className="p-2 bg-red-500/90 rounded-full hover:bg-red-500 text-white transition-colors shadow-sm"><Trash2 className="w-4 h-4" /></button>
                          <button onClick={() => moveMedia(idx, 'down')} disabled={idx === mediaAssets.length - 1} className="p-2 bg-white/90 rounded-full hover:bg-white text-slate-700 disabled:opacity-50 transition-colors shadow-sm"><ArrowDown className="w-4 h-4" /></button>
                        </div>
                      </div>
                      
                      {/* Info Area */}
                      <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded">
                            {asset.tag}
                          </span>
                          <button onClick={() => copyToClipboard(asset.tag)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="Copiar Tag"><Copy className="w-4 h-4" /></button>
                        </div>
                        <input
                          type="text"
                          value={asset.rule || ''}
                          onChange={(e) => updateMediaRule(idx, e.target.value)}
                          placeholder="Condición (ej: Si pide tallas)"
                          className="w-full text-xs p-1.5 border border-slate-200 rounded text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400"
                          title="¿Cuándo enviar esta imagen? Deja en blanco para usar solo el [MEDIA_X]"
                        />
                      </div>
                    </div>
                  ))}
                  {mediaAssets.length === 0 && (
                    <div className="w-full h-32 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                      <ImageIcon className="w-6 h-6 mb-2 opacity-50" />
                      <span className="text-xs font-medium">Sube fotos o audios para generar las etiquetas [MEDIA_X]</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
