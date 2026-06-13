import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("Messages:", data);
  
  const { data: lead } = await supabase.from('leads').select('id, name, status, board_type, address, city').order('created_at', { ascending: false }).limit(2);
  console.log("Leads:", lead);
}
check();
