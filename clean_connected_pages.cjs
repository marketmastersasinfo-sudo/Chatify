const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

// The 13 Phone IDs from whatsapp_numbers that were mistakenly auto-synced into connected_pages
const waPhoneIds = [
  '440561942476804', '528853520312028', '645972178588648', '759578923901833',
  '778682605321899', '695765996958287', '825320060659295', '438850675978196',
  '454283704431997', '378073418733738', '493736050497479', '723025644229688',
  '420492581152329'
];

async function main() {
  console.log('🧹 Limpiando los 13 Phone IDs de WhatsApp de la tabla connected_pages...');

  const { error } = await supabase
    .from('connected_pages')
    .delete()
    .in('page_id', waPhoneIds);

  if (error) console.error('Error limpiando:', error);
  else console.log('✅ Eliminados los 13 registros duplicados de WhatsApp en connected_pages.');

  const { data: remaining } = await supabase.from('connected_pages').select('*');
  console.log(`\n🎉 TOTAL DE FAN PAGES REALES EN SUPABASE: ${remaining ? remaining.length : 0}`);
}

main();
