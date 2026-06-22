import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: store } = await supabase.from('stores').select('id, name, twilio_phone_number').ilike('name', '%shopyeasy%').single();
  console.log("STORE:", store);
}
check();
