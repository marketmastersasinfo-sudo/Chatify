const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('stores').select('*').eq('name', 'TiendaPapaya').single();
  if (data) {
    console.log("TIENDAPAPAYA CREDENTIALS:");
    console.log("Phone ID:", data.meta_phone_number_id);
    console.log("WABA ID:", data.waba_id);
    console.log("Token:", data.meta_access_token);
  } else {
    console.log("Not found or error", error);
  }
}
main();
