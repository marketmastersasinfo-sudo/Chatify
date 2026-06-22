import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: lead } = await supabase.from('leads').select('id, name').ilike('name', 'naty%').single();
  const { data: msgs } = await supabase.from('messages').select('*').eq('lead_id', lead.id);
  console.log("MENSAJES:", msgs.map(m => m.content));
}
check();
