import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: store } = await supabase.from('stores').select('*').eq('name', 'Donde Los Primos').single();
    if (!store) return res.status(200).json({ msg: 'Store not found' });

    const waba_id = '477305412128610';
    const phone_number_id = '454283704431997';
    const access_token = 'EAAa44lUrYZBIBR1Dp7FPFTZC1WwQrlH1l5iQxZCbeMWH2CEbnx67wDTICuKe9ay4cxRaVhkGc9KptaOK4bt296TmOI1Q1cD7WZCYYxIizzoxlPcZBrjFW8Gfh2NSfjH2G7LIu8vgkesPJ4w58XR8GR7IBnKxwEy1488dzCWWris7FS9fc2rYLFJL3CwdfZAmk4QQZDZD';

    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({
        waba_id,
        phone_number_id,
        access_token
      })
      .eq('store_id', store.id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ success: true, message: 'Donde Los Primos credentials updated' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
