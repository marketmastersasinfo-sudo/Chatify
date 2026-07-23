import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stores } = await supabase.from('stores').select('*').in('name', ['Donde Los Primos', 'Maxitiendas']);
  console.log("Stores found:", stores?.map(s => ({ id: s.id, name: s.name })));

  if (!stores || stores.length === 0) return;

  for (const store of stores) {
    const { data: wa } = await supabase.from('whatsapp_numbers').select('*').eq('store_id', store.id).single();
    console.log(`WhatsApp config for ${store.name}:`, wa ? { phone_number_id: wa.phone_number_id, waba_id: wa.waba_id, token_exists: !!wa.access_token } : 'Not found');

    // Add templates
    const templatesToInsert = [
      { template_name: 'carrito_abandonado_inicial_utility_v1_texto', template_type: 'UTILITY' },
      { template_name: 'carrito_abandonado_recordatorio1_marketing_v1_optimizado', template_type: 'MARKETING' },
      { template_name: 'carrito_abandonado_recordatorio_final_marketing_v1_optimizado', template_type: 'MARKETING' },
      { template_name: 'confirmacion_inicial_v1_optimizada', template_type: 'UTILITY' },
    ].map(t => ({
      store_id: store.id,
      template_name: t.template_name,
      template_type: t.template_type,
      is_active: true,
      sent_count: 0,
      conversion_count: 0
    }));

    const { error: insertError } = await supabase.from('store_templates').upsert(templatesToInsert, { onConflict: 'store_id,template_name' });
    if (insertError) {
      console.error(`Error inserting templates for ${store.name}:`, insertError);
    } else {
      console.log(`Successfully inserted/upserted templates for ${store.name}`);
    }
  }
}
main();
