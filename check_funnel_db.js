import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data, error } = await supabase.from('flow_templates').select('*').limit(1);
  console.log("SCHEMA:", data ? Object.keys(data[0]) : error);
  console.log("SAMPLE:", JSON.stringify(data[0], null, 2));
}
check();
