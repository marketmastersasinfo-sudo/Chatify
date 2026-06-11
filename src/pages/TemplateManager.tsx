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
    const { data: storesData } = await supabase.from('stores').select('*');
    setStores(storesData || []);

    // Load templates
    const { data: templatesData } = await supabase.from('store_templates').select('*');
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
      await supabase.from('store_templates').update({ [field]: value } as any).eq('id', existing.id);
      // Update State
      updatedTemplates = updatedTemplates.map(t => t.id === existing.id ? { ...t, [field]: value } : t);
    } else {
      // Insert DB
      const newTemplate = { store_id: storeId, template_type: type, [field]: value, template_name: field === 'template_name' ? value : '' };
      const { data } = await supabase.from('store_templates').insert(newTemplate as any).select().single();
      if (data) updatedTemplates.push(data as any);
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
  return (
    <div className="space-y-4 bg-gray-50/30 p-5 rounded-xl border border-gray-100">
      <h4 className="font-semibold text-gray-800 flex items-center gap-2">
        <MessageSquareDashed className="h-4 w-4 text-blue-500" />
        {title}
      </h4>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Nombre en Meta (Plantilla)</label>
        <input
          type="text"
          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
          placeholder="ej: confirmacion_pedido_v1"
          value={template.template_name || ''}
          onChange={(e) => onUpdateField(store.id, type, 'template_name', e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Imagen de Cabecera (Opcional)</label>
        {template.image_url ? (
          <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white">
            <img src={template.image_url} alt="Template header" className="w-full h-32 object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <label className="cursor-pointer bg-white text-gray-900 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                Cambiar Imagen
                <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileUpload(e, store.id, type)} />
              </label>
            </div>
          </div>
        ) : (
          <div className="mt-1 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-6 bg-white hover:bg-gray-50 transition-colors">
            <div className="text-center">
              {isSaving ? (
                <Loader2 className="mx-auto h-8 w-8 text-blue-500 animate-spin" />
              ) : (
                <ImageIcon className="mx-auto h-8 w-8 text-gray-300" aria-hidden="true" />
              )}
              <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                <label className="relative cursor-pointer rounded-md font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                  <span>Subir archivo</span>
                  <input type="file" className="sr-only" accept="image/*" onChange={(e) => onFileUpload(e, store.id, type)} disabled={isSaving} />
                </label>
              </div>
              <p className="text-xs leading-5 text-gray-600">PNG, JPG hasta 5MB</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
