import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: stores } = await supabase.from('stores').select('*').in('name', ['Donde Los Primos', 'Maxitiendas']);
    if (!stores || stores.length === 0) return res.status(200).json({ msg: 'Stores not found' });

    let results = [];
    for (const store of stores) {
      const templatesToInsert = [
        { template_name: 'carrito_abandonado_inicial_utility_v1_texto', template_type: 'UTILITY' },
        { template_name: 'carrito_abandonado_recordatorio1_marketing_v1_optimizado', template_type: 'MARKETING' },
        { template_name: 'carrito_abandonado_recordatorio_final_marketing_v1_optimizado', template_type: 'MARKETING' },
        { template_name: 'confirmacion_inicial_v1_optimizada', template_type: 'UTILITY' },
      ].map(t => ({
        store_id: store.id,
        template_name: t.template_name,
        template_type: t.template_type,
        is_active: true,
        sent_count: 0,
        conversion_count: 0
      }));

      const { data, error } = await supabase.from('store_templates').upsert(templatesToInsert, { onConflict: 'store_id,template_name' }).select();
      if (error) {
        results.push({ store: store.name, error });
      } else {
        results.push({ store: store.name, success: true, count: data?.length });
      }
    }
    return res.status(200).json({ success: true, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
