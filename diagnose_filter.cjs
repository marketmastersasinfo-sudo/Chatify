const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Ver si el lead de ShopifYa se creó
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, store_id, created_at')
    .order('created_at', { ascending: false })
    .limit(3);
  console.log("=== ÚLTIMOS LEADS ===");
  leads.forEach(l => console.log(`${l.name} | Store: ${l.store_id} | Created: ${l.created_at}`));

  // 2. Ver qué tiendas aparecen vs no aparecen y qué tienen diferente
  const showInFilter = ['ComprasYa', 'Dondelosprimos', 'GuateShop', 'TiendaPapaya', 'VenezuelaShop', 'Yaencasa'];
  const notInFilter = ['ShopifYa', 'Maxitiendas', 'Uwashop', 'Yacompro', 'ArgenShop', 'CostaRicaShop', 'Ecuashop'];
  
  const { data: allStores } = await supabase
    .from('stores')
    .select('*')
    .order('name');

  console.log("\n=== COMPARACIÓN: Tiendas que SÍ aparecen vs NO ===");
  for (const store of allStores) {
    const appears = showInFilter.includes(store.name) ? '✅ APARECE' : '❌ NO APARECE';
    console.log(`${appears} | ${store.name} | country: ${store.country} | provider: ${store.provider} | waba_number: ${store.waba_number || 'null'} | meta_wa_active: ${store.meta_wa_active}`);
  }
}

main();
