import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.vercel' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTmpl() {
  const { data: store } = await supabase.from('stores').select('id, name').ilike('name', '%papaya%').single();
  if (!store) return console.log('Store not found');
  
  const { data: waNumber } = await supabase.from('whatsapp_numbers').select('waba_id, access_token').eq('store_id', store.id).single();
  if (!waNumber) return console.log('WABA not found for store');
  const res = await fetch(`https://graph.facebook.com/v19.0/${waNumber.waba_id}/message_templates?name=confirmacion_seguimiento_4horas_v1_optimizado`, {
    headers: { 'Authorization': `Bearer ${waNumber.access_token}` }
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

checkTmpl();
