import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupAndRecover() {
  console.log("Cleaning up botched recovery leads...");
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // Last 2 hours

  const { data: toDelete, error: fetchErr } = await supabase
    .from('leads')
    .select('id')
    .eq('traffic_source', 'Shopyeasy Webhook')
    .gte('created_at', cutoff);

  if (fetchErr) {
    console.error("Error fetching leads to cleanup:", fetchErr);
    return;
  }

  if (toDelete && toDelete.length > 0) {
    const ids = toDelete.map(l => l.id);
    const { error: delErr } = await supabase.from('leads').delete().in('id', ids);
    if (delErr) {
      console.error("Error deleting leads:", delErr);
      return;
    }
    console.log(`Successfully deleted ${ids.length} botched leads.`);
  } else {
    console.log("No leads to cleanup.");
  }
}

cleanupAndRecover();
