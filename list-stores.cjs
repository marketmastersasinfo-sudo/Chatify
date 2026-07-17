const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listStores() {
  const { data, error } = await supabase
    .from('stores')
    .select('id, name')
    .order('name');
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log(`\nTotal tiendas en Chatify: ${data.length}\n`);
  data.forEach((store, i) => {
    console.log(`${i + 1}. ${store.name}`);
  });
}

listStores();
