import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { data: messages } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
    
    return res.status(200).json({ success: true, messages });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
