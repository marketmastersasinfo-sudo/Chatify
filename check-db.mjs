import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("No VITE_SUPABASE_ANON_KEY found in process.env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('messages')
    .select('content, created_at, sender_type')
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (error) console.error("Error:", error);
  else console.log("Últimos mensajes:", data);
}

check();
