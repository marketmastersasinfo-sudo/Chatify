const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔄 Sincronizando whatsapp_numbers -> stores...');
  
  const { data: waNumbers } = await supabase.from('whatsapp_numbers').select('*');
  const { data: stores } = await supabase.from('stores').select('*');

  if (!waNumbers || !stores) return;

  for (const num of waNumbers) {
    if (!num.store_id) continue;

    const store = stores.find(s => s.id === num.store_id);
    if (store) {
      console.log(`Actualizando tienda ${store.name} con datos de ${num.display_name}...`);
      const { error } = await supabase.from('stores').update({
        meta_phone_number_id: num.phone_number_id,
        meta_waba_id: num.waba_id,
        meta_access_token: num.access_token,
        waba_number: num.phone_number
      }).eq('id', store.id);

      if (error) console.error(`Error actualizando ${store.name}:`, error);
      else console.log(`✅ Tienda ${store.name} actualizada correctamente.`);
    }
  }

  console.log('\n🎉 Sincronización completada.');
}

main();
