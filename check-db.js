import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const envVars = Object.fromEntries(envFile.split('\n').map(line => line.split('=')));

const supabase = createClient(envVars['VITE_SUPABASE_URL'].trim(), envVars['VITE_SUPABASE_SERVICE_ROLE_KEY']?.trim() || envVars['VITE_SUPABASE_ANON_KEY']?.trim());

async function check() {
  const { data: leads } = await supabase.from('leads').select('id, phone, status, store_id').order('created_at', { ascending: false }).limit(2);
  console.log('RECENT LEADS:', leads);
  
  if (leads && leads.length > 0) {
    const { data: msgs } = await supabase.from('messages').select('content, sender_type, created_at').eq('lead_id', leads[0].id).order('created_at', { ascending: false }).limit(3);
    console.log('MESSAGES FOR LAST LEAD:', msgs);
  }
}
check();
