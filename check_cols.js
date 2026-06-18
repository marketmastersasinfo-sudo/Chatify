import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://gygrudkogjqymmcubnon.supabase.co', 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w');

async function run() {
  const { data: cols } = await supabase.rpc('get_columns', { table_name: 'store_templates' });
  // Instead of rpc which might not exist, we just select 1 row
  const { data } = await supabase.from('store_templates').select('*').limit(1);
  console.log('store_templates:', Object.keys(data[0] || {}));
  
  const { data: msgs } = await supabase.from('messages').select('*').limit(1);
  console.log('messages:', Object.keys(msgs[0] || {}));
}

run();
