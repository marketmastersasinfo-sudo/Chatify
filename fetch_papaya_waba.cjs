const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: store } = await supabase
    .from('stores')
    .select('*')
    .eq('id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .single();

  const token = store.meta_access_token;
  const phoneId = store.meta_phone_number_id;

  const url = `https://graph.facebook.com/v20.0/${phoneId}?access_token=${token}`;
  
  https.get(url, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Respuesta Meta Phone Info básica:', data);
    });
  });
}

main();
