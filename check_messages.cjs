const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'C:/Users/felip/.gemini/antigravity-ide/scratch/chatify/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: leads } = await supabase.from('leads').select('id, name, phone, traffic_source').order('created_at', { ascending: false }).limit(5);
  console.log("LAST 5 LEADS:", leads);

  for (const lead of leads || []) {
    const { data: messages } = await supabase.from('messages').select('content, sender_type, created_at').eq('lead_id', lead.id).order('created_at', { ascending: true });
    console.log(`\nMESSAGES FOR LEAD ${lead.name} (${lead.phone}):`);
    messages.forEach(m => console.log(`[${m.sender_type}] ${JSON.stringify(m.content)}`));
  }
}
check();
