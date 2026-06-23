import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env', 'utf-8');
const url = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_URL=')).split('=')[1].trim();
const key = env.split('\n').find(l => l.startsWith('VITE_SUPABASE_ANON_KEY=')).split('=')[1].trim();

const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.from('leads').select('*').eq('status', 'closed');
  if (error) { console.error(error); return; }
  
  for (const lead of data) {
    if (!lead.total_price) {
      await supabase.from('leads').update({ total_price: 85000 }).eq('id', lead.id);
      console.log(`Updated lead ${lead.name}`);
    }
  }
}
run();
