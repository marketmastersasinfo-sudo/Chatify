import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gygrudkogjqymmcubnon.supabase.co',
  'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w'
);

async function check() {
  const { data: lead } = await supabase.from('leads').select('id, name, product_name, store_id').ilike('name', 'naty%').single();
  console.log("LEAD:", lead);
  
  if (lead && lead.product_name) {
    const searchTerm = lead.product_name.substring(0, 15);
    const { data: product } = await supabase.from('products')
      .select('name, media_assets')
      .eq('store_id', lead.store_id)
      .ilike('name', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
      
    console.log("PRODUCT:", product);
  }
}
check();
