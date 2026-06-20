import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Music, Loader2, Save, Trash2, Copy, Store, Plus } from 'lucide-react';
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
  const [promptWa, setPromptWa] = useState('');
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
    setPromptWa('');
    setMediaAssets([]);
    setIsAdding(true);
  }

  function handleEditClick(prod: any) {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price.toString());
    
    let parsedPrompt = '';
    try {
      parsedPrompt = JSON.parse(prod.master_prompt).whatsapp || '';
    } catch {
      parsedPrompt = prod.master_prompt || '';
    }
    setPromptWa(parsedPrompt);

    let parsedMedia = [];
    try {
      if (prod.media_assets) parsedMedia = JSON.parse(prod.media_assets);
    } catch {}
    setMediaAssets(Array.isArray(parsedMedia) ? parsedMedia : []);
    
    setIsAdding(true);
  }

  async function handleSave() {
    if (!name || !price || !selectedStore) return;
    setSaving(true);
    try {
      const master_prompt = JSON.stringify({ whatsapp: promptWa, social: '' });
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
            maxSizeMB: 0.5, // 500KB max for WhatsApp
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
    // Retag remaining
    const retagged = newAssets.map((a, i) => ({ ...a, tag: `[MEDIA_${i + 1}]` }));
    setMediaAssets(retagged);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert(`Copiado: ${text}`);
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Catálogo de Productos</h1>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Gestiona tus productos, su Inteligencia Artificial y sus fotos/audios.
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
              Agregar Producto
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
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Precio</th>
                <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-white">Assets</th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Editar</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-500">No hay productos en esta tienda.</td></tr>
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
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                            <ImageIcon className="w-3 h-3" /> {assets.length} archivos
                          </span>
                        ) : 'Sin archivos'}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <button onClick={() => handleEditClick(p)} className="text-blue-600 hover:text-blue-900">Configurar IA</button>
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
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>
          </div>
          
          <div className="px-4 py-6 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Columna Izquierda: Datos y Archivos */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Nombre exacto del Producto</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Jogger Variable Hombre" className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" />
                <p className="mt-1 text-xs text-gray-500">Debe coincidir con la palabra clave que usa el cliente para que el bot sepa de qué hablan.</p>
              </div>

              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900 dark:text-white">Precio Base</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="99000" className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white" />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Librería Multimedia (Imágenes y Notas de Voz)</h4>
                <p className="text-xs text-gray-500 mb-4">Sube archivos y pega sus Tags en el Prompt Maestro para que la IA los envíe cuando tú decidas.</p>
                
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*, audio/mp3, audio/ogg, audio/mpeg" multiple onChange={handleFileUpload} />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex justify-center items-center gap-2"
                >
                  {uploadingMedia ? <><Loader2 className="w-5 h-5 animate-spin" /> Comprimiendo y subiendo...</> : <><Plus className="w-5 h-5" /> Subir Imagen o Audio</>}
                </button>

                <div className="mt-4 space-y-3">
                  {mediaAssets.map((asset, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        {asset.type === 'image' ? <ImageIcon className="w-5 h-5 text-blue-500" /> : <Music className="w-5 h-5 text-purple-500" />}
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900 dark:text-white font-mono flex items-center gap-2">
                            {asset.tag}
                            <button onClick={() => copyToClipboard(asset.tag)} className="text-gray-400 hover:text-blue-600"><Copy className="w-3 h-3" /></button>
                          </span>
                          <span className="text-xs text-gray-500 truncate w-32">{asset.url}</span>
                        </div>
                      </div>
                      <button onClick={() => removeMedia(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded-md">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Prompt Maestro */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex justify-between items-center">
                Prompt Maestro (WhatsApp)
              </h4>
              <p className="text-xs text-gray-500 mb-4">Instrucciones para vender este producto. Pega los Tags <code>[MEDIA_X]</code> aquí adentro.</p>
              <textarea 
                rows={16}
                value={promptWa}
                onChange={e => setPromptWa(e.target.value)}
                className="block w-full rounded-md border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 dark:bg-gray-800 dark:ring-gray-700 dark:text-white font-mono text-xs"
                placeholder={`OBJETIVO: Vender los Joggers UrbanFit.
TONO: Coloquial colombiano.

Cuando el cliente te salude, dile que es un gusto atenderlo y envíale la foto: [MEDIA_1]

Si el cliente te dice que está muy caro, envíale el audio donde explicamos la calidad de la tela: [MEDIA_2] y dales seguridad.`}
              />
              
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setIsAdding(false)} className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-white dark:ring-gray-700">
                  Cancelar
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="flex items-center gap-2 rounded-md bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Producto e IA
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
