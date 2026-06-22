import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: lead } = await supabase.from('leads').select('id, name, phone, created_at').eq('id', 'd502989a-994b-414c-8cd0-51ab88917f8f').single();
  console.log("LEAD:", lead);
}
check();
