import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    // Buscar la tienda VenezuelaShop
    const { data: store } = await supabase.from('stores')
      .select('id, name')
      .eq('name', 'VenezuelaShop')
      .single();
      
    if (!store) {
      return res.status(404).json({ success: false, error: 'Tienda VenezuelaShop no encontrada' });
    }

    // Ver plantillas configuradas
    const { data: templates } = await supabase.from('store_templates')
      .select('template_name, template_type, is_active, twilio_content_sid')
      .eq('store_id', store.id);
      
    res.status(200).json({ success: true, store, templates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
