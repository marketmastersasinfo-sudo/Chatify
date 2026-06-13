import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://gygrudkogjqymmcubnon.supabase.co', 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w');
async function run() {
  const { data } = await supabase.from('store_templates').select('template_name, twilio_content_sid');
  console.log(data);
}
run();
