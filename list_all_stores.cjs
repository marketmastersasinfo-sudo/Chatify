const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Ver TODAS las tiendas que existen
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, organization_id, waba_number, meta_phone_number_id, meta_waba_id, meta_wa_active')
    .order('name');
    
  if (error) console.error(error);
  else {
    console.log(`=== TOTAL DE TIENDAS: ${stores.length} ===\n`);
    stores.forEach(s => {
      console.log(`Tienda: ${s.name}`);
      console.log(`  ID: ${s.id}`);
      console.log(`  Org ID: ${s.organization_id}`);
      console.log(`  WhatsApp #: ${s.waba_number || '(vacío)'}`);
      console.log(`  Phone Number ID: ${s.meta_phone_number_id || '(vacío)'}`);
      console.log(`  WABA ID: ${s.meta_waba_id || '(vacío)'}`);
      console.log(`  WA Activo: ${s.meta_wa_active}`);
      console.log('---');
    });
  }
}

main();
