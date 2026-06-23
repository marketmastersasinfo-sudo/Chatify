import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    const logs = [];

    // Arreglar versión 1 -> T1
    const { data: d1, error: e1 } = await supabase.from('store_templates')
      .update({ template_type: 'recuperar_carrito_t1' })
      .eq('template_name', 'recuperar_carrito_version1')
      .select('store_id, template_name, template_type');
    logs.push({ update: 'version1 -> t1', data: d1, error: e1 });

    // Arreglar versión 2 -> T2
    const { data: d2, error: e2 } = await supabase.from('store_templates')
      .update({ template_type: 'recuperar_carrito_t2' })
      .eq('template_name', 'recuperar_carrito_version2')
      .select('store_id, template_name, template_type');
    logs.push({ update: 'version2 -> t2', data: d2, error: e2 });

    // Arreglar versión 3 -> T3
    const { data: d3, error: e3 } = await supabase.from('store_templates')
      .update({ template_type: 'recuperar_carrito_t3' })
      .eq('template_name', 'recuperar_carrito_version3')
      .select('store_id, template_name, template_type');
    logs.push({ update: 'version3 -> t3', data: d3, error: e3 });
      
    res.status(200).json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
