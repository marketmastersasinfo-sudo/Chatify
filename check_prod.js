import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: prod } = await supabase.from('products').select('*').ilike('name', '%JOGGER HOMBRE VARIABLE%').limit(1).single();
  console.log("PRODUCTO:", prod.name);
  console.log("MEDIA ASSETS:", prod.media_assets);
}
check();
