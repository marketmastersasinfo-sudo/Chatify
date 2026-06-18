import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://gygrudkogjqymmcubnon.supabase.co', 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w');

async function run() {
  // First, delete any old order_confirmation for ComprasYa
  const storeId = 'c6f3f1b1-42b6-4147-82c7-4bf440f8b38d';
  
  await supabase
    .from('store_templates')
    .delete()
    .eq('store_id', storeId)
    .eq('template_type', 'order_confirmation')
    .neq('template_name', 'confirmacion_pedido_v2');

  // Set the new one to order_confirmation
  const { data, error } = await supabase
    .from('store_templates')
    .update({ template_type: 'order_confirmation' })
    .eq('store_id', storeId)
    .eq('template_name', 'confirmacion_pedido_v2')
    .select();

  console.log('Updated:', data, 'Error:', error);
}

run();
