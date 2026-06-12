import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentLeads() {
  console.log("Fetching 10 most recent leads...");
  const { data, error } = await supabase
    .from('leads')
    .select('id, name, status, board_type, traffic_source, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (error) console.error("Error:", error);
  else console.log("Recent Leads:", data);
}

checkRecentLeads();
