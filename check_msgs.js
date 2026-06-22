import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: lead } = await supabase.from('leads').select('*').eq('phone', '573232812527').single();
  console.log("LEAD:", lead);
  if (lead) {
    const { data: msgs } = await supabase.from('messages').select('*').eq('lead_id', lead.id).order('created_at', { ascending: true });
    console.log("MENSAJES:");
    msgs.forEach(m => console.log(`[${m.sender_type}] ${m.content}`));
  }
}
check();
