import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'; 
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
  console.log(data);
}
check();
