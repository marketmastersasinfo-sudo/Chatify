import { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Target, Save, Loader2, RefreshCcw } from 'lucide-react';
import { CountryFlag } from '../utils/flags';

export function PixelTracking() {
  const { user, isAdmin } = useAuth();
  const storeIds = (user as any)?.storeIds || (user as any)?.storeAccess?.map((a: any) => a.storeId) || [];
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, [storeIds]);

  const fetchStores = async () => {
    setLoading(true);
    let query = supabase.from('stores').select('*').order('country');
    if (!isAdmin) {
      if (!storeIds || storeIds.length === 0) {
        setStores([]);
        setLoading(false);
        return;
      }
      query = query.in('id', storeIds);
    }
    const { data } = await query;
    setStores(data || []);
    setLoading(false);
  };

  const handleSave = async (store: any) => {
    setSaving(store.id);
    try {
      const { error } = await (supabase as any)
        .from('stores')
        .update({
          meta_pixel_id: store.meta_pixel_id,
          meta_capi_token: store.meta_capi_token,
          tiktok_pixel_id: store.tiktok_pixel_id,
          tiktok_access_token: store.tiktok_access_token,
          google_conversion_id: store.google_conversion_id
        })
        .eq('id', store.id);

      if (error) throw error;
      alert('Píxeles guardados exitosamente');
    } catch (e) {
      alert('Error al guardar los píxeles');
      console.error(e);
    }
    setSaving(null);
  };

  const updateStoreField = (id: string, field: string, value: string) => {
    setStores(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>;
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto pb-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Target className="w-7 h-7 text-blue-600" /> Tracking Avanzado (API)
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configura Facebook CAPI, TikTok Events API y Google Ads por tienda.</p>
      </div>

      <div className="space-y-6">
        {stores.map(store => (
          <div key={store.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <CountryFlag country={store.country} />
                <h3 className="text-lg font-bold text-slate-800">{store.name}</h3>
              </div>
              <button 
                onClick={() => handleSave(store)}
                disabled={saving === store.id}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-70"
              >
                {saving === store.id ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Facebook */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-blue-600 font-bold">f</div>
                  <h4 className="font-bold text-slate-700">Facebook CAPI</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Pixel ID</label>
                  <input 
                    type="text" 
                    value={store.meta_pixel_id || ''}
                    onChange={(e) => updateStoreField(store.id, 'meta_pixel_id', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600" 
                    placeholder="1234567890" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Access Token</label>
                  <input 
                    type="password" 
                    value={store.meta_capi_token || ''}
                    onChange={(e) => updateStoreField(store.id, 'meta_capi_token', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-600" 
                    placeholder="EAA..." 
                  />
                </div>
              </div>

              {/* TikTok */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-bold">t</div>
                  <h4 className="font-bold text-slate-700">TikTok Events API</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Pixel ID / Code</label>
                  <input 
                    type="text" 
                    value={store.tiktok_pixel_id || ''}
                    onChange={(e) => updateStoreField(store.id, 'tiktok_pixel_id', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-black" 
                    placeholder="CB..." 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Access Token</label>
                  <input 
                    type="password" 
                    value={store.tiktok_access_token || ''}
                    onChange={(e) => updateStoreField(store.id, 'tiktok_access_token', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-black" 
                    placeholder="Token..." 
                  />
                </div>
              </div>

              {/* Google Ads */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded bg-red-100 flex items-center justify-center text-red-600 font-bold">G</div>
                  <h4 className="font-bold text-slate-700">Google Ads</h4>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Conversion ID</label>
                  <input 
                    type="text" 
                    value={store.google_conversion_id || ''}
                    onChange={(e) => updateStoreField(store.id, 'google_conversion_id', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-red-600" 
                    placeholder="AW-..." 
                  />
                </div>
                <div className="pt-2 text-xs text-slate-500 leading-relaxed">
                  Para Google Ads, requerimos el ID para conversiones offline. Asegúrate de configurar la captura de `gclid` en tus links.
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
