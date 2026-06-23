import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    // Buscar por nombre o telefono
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .or('name.ilike.%Jose Con%,phone.ilike.%584245888874%');
      
    res.status(200).json({ success: true, leads: data, error });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
