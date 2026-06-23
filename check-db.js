import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) env[key.trim()] = vals.join('=').trim().replace(/"/g, '').replace(/'/g, '');
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const supabaseKey = env['VITE_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: store } = await supabase.from('stores')
      .select('id, name')
      .eq('name', 'VenezuelaShop')
      .single();
      
  console.log("Store:", store);

  if (store) {
    const { data: templates } = await supabase.from('store_templates')
      .select('template_name, template_type, is_active, twilio_content_sid')
      .eq('store_id', store.id);
    console.log("Templates:", templates);
    
    // Check one of the leads from the screenshot
    const { data: lead } = await supabase.from('leads')
      .select('id, name, phone, status, recovery_touch, created_at')
      .eq('store_id', store.id)
      .ilike('name', '%Multiservicios%')
      .limit(1).single();
    console.log("Lead:", lead);
  }
}

check();
