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
      const { data: wa } = await supabase.from('whatsapp_numbers').select('*').eq('store_id', store.id).single();
      if (!wa) {
        results.push({ store: store.name, error: 'No whatsapp_numbers entry found' });
      } else {
        results.push({
          store: store.name,
          phone_number_id: wa.phone_number_id,
          waba_id: wa.waba_id,
          has_token: !!wa.access_token
        });
      }
    }
    return res.status(200).json({ success: true, results });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
