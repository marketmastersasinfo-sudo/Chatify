import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: store } = await supabase.from('stores').select('id, name, twilio_phone_number').eq('name', 'ComprasYa').single();
  console.log("STORE:", store);
  
  const { data: lead } = await supabase.from('leads').select('id, name, phone, store_id').ilike('name', 'naty%').single();
  console.log("LEAD STORE ID:", lead?.store_id);
}
check();
