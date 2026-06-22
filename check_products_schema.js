import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: products, error } = await supabase.from('products').select('*').limit(1);
  if (error) console.error(error);
  else console.log(Object.keys(products[0]));
}
check();
