import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: messages } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(10);
    const { data: raw_leads } = await supabase.from('leads').select('*').eq('phone', '573182533893').order('created_at', { ascending: false });
    
    return res.status(200).json({ success: true, messages, leads: raw_leads });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
