import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env'), 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: leads } = await supabase.from('leads').select('id, name, phone, traffic_source, status').order('created_at', { ascending: false }).limit(8);
  console.log("LAST 8 LEADS:");
  console.log(leads);

  for (const lead of leads || []) {
    const { data: messages } = await supabase.from('messages').select('content, sender_type, created_at').eq('lead_id', lead.id).order('created_at', { ascending: true });
    console.log(`\nMESSAGES FOR LEAD ${lead.name} (${lead.phone}) [Source: ${lead.traffic_source}]:`);
    messages.forEach(m => console.log(`[${m.sender_type}] ${JSON.stringify(m.content)}`));
  }
}
check();
