const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: waNumbers } = await supabase.from('whatsapp_numbers').select('*').order('name');
  const { data: stores } = await supabase.from('stores').select('*').order('name');
  const { data: storeTemplates } = await supabase.from('store_templates').select('*');

  console.log('====================================================');
  console.log('DETALLE COMPLETO DE CADA NÚMERO Y SU ESTADO REAL');
  console.log('====================================================\n');

  if (!waNumbers) {
    console.log('No hay whatsapp_numbers');
    return;
  }

  for (const num of waNumbers) {
    const store = stores.find(s => s.id === num.store_id || s.name.toLowerCase() === num.name.toLowerCase());
    const templatesForStore = storeTemplates.filter(t => t.store_id === (store ? store.id : num.store_id));

    console.log(`📱 TIENDA/NÚMERO: ${num.name}`);
    console.log(`   Número de teléfono: ${num.phone_number}`);
    console.log(`   Número Display: ${num.display_phone_number}`);
    console.log(`   Phone Number ID: ${num.phone_number_id}`);
    console.log(`   WABA ID: ${num.waba_id}`);
    console.log(`   Access Token presente: ${num.access_token ? 'SÍ (' + num.access_token.substring(0, 15) + '...)' : 'NO ❌'}`);
    console.log(`   Estado DB (is_active): ${num.is_active}`);
    console.log(`   Configuración Store vinculada: ${store ? store.name + ' (ID: ' + store.id + ')' : 'NO ENCONTRADA ❌'}`);
    console.log(`   Plantillas registradas en DB: ${templatesForStore.length}`);
    if (templatesForStore.length > 0) {
      console.log(`     Nombres de plantillas: ${templatesForStore.map(t => t.template_name).join(', ')}`);
    }
    console.log('----------------------------------------------------');
  }
}

main();
