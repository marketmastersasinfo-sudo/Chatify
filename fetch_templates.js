import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://gygrudkogjqymmcubnon.supabase.co', 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w');

async function run() {
  const { data } = await supabase.from('store_templates').select('*');
  console.log(JSON.stringify(data, null, 2));
}

run();
