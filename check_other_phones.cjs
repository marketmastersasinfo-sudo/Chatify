const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhone(storeName) {
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('name', storeName)
    .single();

  if (!store || !store.meta_phone_number_id || !store.meta_access_token) {
    console.log(`Store ${storeName} not configured`);
    return;
  }

  const url = `https://graph.facebook.com/v20.0/${store.meta_phone_number_id}?access_token=${store.meta_access_token}`;
  
  https.get(url, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`\n=== PHONE INFO FOR ${storeName} ===`);
      console.log(data);
    });
  });
}

async function main() {
  await checkPhone('Dondelosprimos');
  await checkPhone('ShopifYa');
}

main();
