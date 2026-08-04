const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Ver user_store_access
  const { data, error } = await supabase
    .from('user_store_access')
    .select('*, store:stores(name), user:chatify_users(name, email, role)');
    
  if (error) console.error("Error:", error);
  else {
    console.log(`=== ACCESOS (${data.length}) ===`);
    data.forEach(a => {
      console.log(`${a.user?.name} (${a.user?.email}) → ${a.store?.name}`);
    });
  }

  // Obtener TODAS las tiendas
  const { data: allStores } = await supabase.from('stores').select('id, name').order('name');
  console.log(`\n=== TODAS LAS TIENDAS (${allStores?.length}) ===`);
  allStores?.forEach(s => console.log(`${s.name} → ${s.id}`));
}

main();
