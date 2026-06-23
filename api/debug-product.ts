import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    const { data: product } = await supabase.from('products')
      .select('name, media_assets, master_prompt, flow_template_id')
      .ilike('name', '%Semillas de cal%')
      .limit(1).single();
      
    res.status(200).json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
