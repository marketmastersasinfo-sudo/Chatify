import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function check() {
  const { data: store } = await supabase.from('stores').select('*').eq('name', 'ComprasYa').single();
  console.log('Store ID:', store?.id);
  
  if (!store) return console.log('Store not found');

  const { data: templates } = await supabase.from('store_templates').select('*').eq('store_id', store.id).eq('template_type', 'order_confirmation');
  console.log('Templates found:', templates?.length);
  
  if (templates) {
    for (const t of templates) {
      console.log('Template:', t.template_name, t.twilio_content_sid);
      try {
        const content = await client.content.v1.contents(t.twilio_content_sid).fetch();
        console.log('Content types:', JSON.stringify(content.types, null, 2));
      } catch (e) {
        console.error('Twilio fetch error:', e.message);
      }
    }
  }
}
check();
