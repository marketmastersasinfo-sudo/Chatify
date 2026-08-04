import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: stores } = await supabase.from('stores').select('id, name').in('name', ['Donde Los Primos', 'Maxitiendas']);
    if (!stores) return res.status(200).json({ msg: 'Stores not found' });

    let results = [];
    for (const st of stores) {
      const { data: wa } = await supabase.from('whatsapp_numbers').select('*').eq('store_id', st.id).single();
      results.push({
        store: st.name,
        phone_number_id: wa?.phone_number_id,
        display_phone_number: wa?.display_phone_number,
        waba_id: wa?.waba_id
      });
    }

    return res.status(200).json({ success: true, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
