import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('stores').select('id, name, waba_id, waba_number');
  if (error) console.error("Error:", error);
  else console.log("Stores in DB:", JSON.stringify(data, null, 2));
}

check();
