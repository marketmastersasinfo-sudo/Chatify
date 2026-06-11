import { useState, useEffect } from 'react';
import { Store, Image as ImageIcon, Loader2, MessageSquareDashed } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function TemplateManager() {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [savingStore, setSavingStore] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    // Load stores
    const { data: storesData } = await (supabase as any).from('stores').select('*');
    setStores(storesData || []);

    // Load templates
    const { data: templatesData } = await (supabase as any).from('store_templates').select('*');
    setTemplates(templatesData || []);
    setLoading(false);
  }

  const getTemplate = (storeId: string, type: string) => {
    return templates.find(t => t.store_id === storeId && t.template_type === type) || {
      store_id: storeId,
      template_type: type,
      template_name: '',
      image_url: ''
    };
  };

  const handleFileUpload = async (event: any, storeId: string, type: string) => {
    const file = event.target.files[0];
    if (!file) return;

    setSavingStore(storeId + type);
    
    // Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${storeId}-${type}-${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('template_images')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      alert('Error subiendo imagen. ¿Marcaste el bucket como público?');
      setSavingStore(null);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('template_images')
      .getPublicUrl(fileName);

    // Update state and DB
    updateTemplateField(storeId, type, 'image_url', publicUrl);
    setSavingStore(null);
  };

  const updateTemplateField = async (storeId: string, type: string, field: string, value: string) => {
    const existing = templates.find(t => t.store_id === storeId && t.template_type === type);
    
    let updatedTemplates = [...templates];
    
    if (existing) {
      // Update DB
      await (supabase as any).from('store_templates').update({ [field]: value }).eq('id', existing.id);
      // Update State
      updatedTemplates = updatedTemplates.map(t => t.id === existing.id ? { ...t, [field]: value } : t);
    } else {
      // Insert DB
      const newTemplate = { store_id: storeId, template_type: type, [field]: value, template_name: field === 'template_name' ? value : '' };
      const { data } = await (supabase as any).from('store_templates').insert(newTemplate).select().single();
      if (data) updatedTemplates.push(data);
    }
    
    setTemplates(updatedTemplates);
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestor de Plantillas Meta</h1>
          <p className="text-gray-500 mt-1">Configura las plantillas y las imágenes para cada tienda.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {stores.map((store) => (
          <div key={store.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-50/50 border-b border-gray-100 px-6 py-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{store.name}</h3>
                <p className="text-sm text-gray-500">ID: {store.id.split('-')[0]}...</p>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Order Confirmation */}
              <TemplateConfigCard 
                title="Confirmación de Pedido" 
                type="order_confirmation"
                store={store}
                template={getTemplate(store.id, 'order_confirmation')}
                onUpdateField={updateTemplateField}
                onFileUpload={handleFileUpload}
                isSaving={savingStore === store.id + 'order_confirmation'}
              />

              {/* Abandoned Cart */}
              <TemplateConfigCard 
                title="Carrito Abandonado" 
                type="abandoned_cart"
                store={store}
                template={getTemplate(store.id, 'abandoned_cart')}
                onUpdateField={updateTemplateField}
                onFileUpload={handleFileUpload}
                isSaving={savingStore === store.id + 'abandoned_cart'}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateConfigCard({ title, type, store, template, onUpdateField, onFileUpload, isSaving }: any) {
  const [localName, setLocalName] = useState(template.template_name || '');

  useEffect(() => {
    setLocalName(template.template_name || '');
  }, [template.template_name]);
  return (
    <div className="space-y-5 bg-gradient-to-b from-white to-gray-50/50 p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
        <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
          <MessageSquareDashed className="h-5 w-5" />
        </div>
        <h4 className="text-base font-bold text-gray-900 tracking-tight">{title}</h4>
      </div>
      
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Nombre en Meta (Plantilla)</label>
        <input
          type="text"
          className="w-full rounded-xl border-gray-200 bg-white/50 px-4 py-2.5 text-sm text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400"
          placeholder="ej: confirmacion_pedido_v1"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => onUpdateField(store.id, type, 'template_name', localName)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">Imagen de Cabecera (Opcional)</label>
        {template.image_url ? (
          <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50/50 shadow-inner">
            <div className="absolute inset-0 bg-[url('https://transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <img src={template.image_url} alt="Template header" className="w-full h-40 object-contain p-2 relative z-10 drop-shadow-md transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gray-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20 backdrop-blur-[2px]">
              <label className="cursor-pointer bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg hover:bg-gray-50 hover:scale-105 transition-transform">
                Actualizar Imagen
                <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileUpload(e, store.id, type)} />
              </label>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-8 hover:bg-gray-50 hover:border-blue-300 transition-all duration-300 group cursor-pointer relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-50/0 group-hover:bg-blue-50/50 transition-colors duration-300"></div>
            <div className="text-center relative z-10">
              {isSaving ? (
                <Loader2 className="mx-auto h-10 w-10 text-blue-500 animate-spin" />
              ) : (
                <div className="mx-auto h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                  <ImageIcon className="h-6 w-6 text-gray-400 group-hover:text-blue-500 transition-colors" aria-hidden="true" />
                </div>
              )}
              <div className="flex text-sm leading-6 text-gray-600 justify-center font-medium">
                <label className="relative cursor-pointer rounded-md text-blue-600 focus-within:outline-none hover:text-blue-500">
                  <span>Haz clic para subir un archivo</span>
                  <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" onChange={(e) => onFileUpload(e, store.id, type)} disabled={isSaving} />
                </label>
              </div>
              <p className="text-xs leading-5 text-gray-400 mt-1">PNG, JPG o GIF hasta 5MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
