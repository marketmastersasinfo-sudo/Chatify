import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: products, error: pError } = await supabase.from('products').select('*').limit(1);
  console.log("PRODUCTS TABLE:", products, pError);

  const { data: storeProducts, error: spError } = await supabase.from('store_products').select('*').limit(1);
  console.log("STORE_PRODUCTS VIEW/TABLE:", storeProducts, spError);
}
check();
