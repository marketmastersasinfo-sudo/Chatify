import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const searchTerm = "JOGGER HOMBRE V";
  const { data: product } = await supabase.from('products')
    .select('name, price, offers, media_assets, master_prompt, flow_template_id')
    .ilike('name', `%${searchTerm}%`)
    .limit(1).maybeSingle();

  console.log("PRODUCT IN DB:", JSON.stringify(product, null, 2));
}

test();
