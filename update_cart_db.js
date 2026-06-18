import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://gygrudkogjqymmcubnon.supabase.co', 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w');

async function run() {
  const storeId = 'c6f3f1b1-42b6-4147-82c7-4bf440f8b38d'; // ComprasYa
  
  // 1. Delete any old mappings for these template_types
  await supabase.from('store_templates').delete()
    .eq('store_id', storeId).in('template_type', ['recuperar_carrito_t1', 'recuperar_carrito_t2', 'recuperar_carrito_t3']);

  // 2. Map the newly created ones to their correct template_type
  await supabase.from('store_templates').update({ template_type: 'recuperar_carrito_t1' }).eq('store_id', storeId).eq('template_name', 'recuperar_carrito_version1');
  await supabase.from('store_templates').update({ template_type: 'recuperar_carrito_t2' }).eq('store_id', storeId).eq('template_name', 'recuperar_carrito_version2');
  await supabase.from('store_templates').update({ template_type: 'recuperar_carrito_t3' }).eq('store_id', storeId).eq('template_name', 'recuperar_carrito_version3');
  
  console.log('Database updated successfully for cart recovery templates!');
}

run();
