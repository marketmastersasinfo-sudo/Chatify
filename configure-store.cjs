const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function configure() {
  const { data, error } = await supabase
    .from('stores')
    .update({ 
      meta_wa_active: true,
      waba_id: '2508397522873921'
    })
    .eq('id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .select('id, name, meta_wa_active, waba_id, meta_phone_number_id')
    .single();

  if (error) console.error('Error:', error);
  else console.log('✅ TiendaPapaya configurada:', data);
}

configure();
