import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.vercel' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWabaFields() {
  const { data } = await supabase.from('whatsapp_numbers').select('waba_id, access_token, stores(name)').eq('waba_id', '1746357732639717').single();
  
  if (!data) return console.log('Store not found');

  const allFields = ['id','name','currency','timezone_id','message_template_namespace','account_review_status','purchase_order_number'];
  
  for (const field of allFields) {
    const res = await fetch(`https://graph.facebook.com/v19.0/${data.waba_id}?fields=${field}`, {
      headers: { 'Authorization': `Bearer ${data.access_token}` }
    });
    const result = await res.json();
    console.log(`Field ${field}:`, result.error ? result.error.message : result[field]);
  }
}

checkWabaFields();
