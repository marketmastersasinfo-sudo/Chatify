const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== VERIFICANDO TODAS LAS FAN PAGES EN SUPABASE (`connected_pages`) ===');
  const { data, error } = await supabase.from('connected_pages').select('*');
  if (error) console.error(error);
  else console.log(data);
}

main();
