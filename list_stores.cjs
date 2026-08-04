const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: stores, error } = await supabase.from('stores').select('*');
  if (error) console.error(error);
  else {
    console.log(`Total stores: ${stores.length}`);
    stores.forEach(s => {
      console.log(`Store: ${s.name}`);
      console.log(`  ID: ${s.id}`);
      console.log(`  WABA #: ${s.waba_number}`);
      console.log(`  Phone Number ID: ${s.meta_phone_number_id}`);
      console.log(`  WABA ID: ${s.meta_waba_id}`);
      console.log(`  Token Presente: ${Boolean(s.meta_access_token)}`);
      console.log(`  WA Activo: ${s.meta_wa_active}`);
      console.log('---');
    });
  }
}

main();
