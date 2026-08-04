const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('whatsapp_numbers').select('display_name, phone_number, phone_number_id, waba_id, business_manager, access_token');
  if (error) console.error(error);
  else {
    console.log('=== VERIFICANDO TOKENS EN whatsapp_numbers ===');
    data.forEach(item => {
      console.log(`📱 ${item.display_name} (${item.phone_number})`);
      console.log(`   Phone ID: ${item.phone_number_id}`);
      console.log(`   WABA ID: ${item.waba_id}`);
      console.log(`   BM: ${item.business_manager}`);
      console.log(`   Token: ${item.access_token ? 'PRESENTE (' + item.access_token.substring(0, 15) + '...)' : '❌ AUSENTE'}`);
      console.log('---');
    });
  }
}

main();
