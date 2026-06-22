import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: lead } = await supabase.from('leads').select('id, name, phone').ilike('name', '%naty%').order('created_at', { ascending: false }).limit(1).single();
  if (!lead) return console.log("Lead no encontrado");
  
  const { data: msgs } = await supabase.from('messages').select('*').eq('lead_id', lead.id);
  console.log("LEAD:", lead);
  console.log("MENSAJES BD:", msgs);
}
check();
