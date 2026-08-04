const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const whatsappToken = 'EAAKuswVq7xABRZC2AM14ZBNahTCozSbNbjiXe73403ZBZBPwPtuZC8CigMERDT8euCBvff3TbHa8BG2Yi3WEFIPxQ6AXvCEZBgvZAdguBzJadWeFpZBGivmNN3MPZB4eTvtvvyH2H0liMB5VAP766U0iVw4K3FC2WWRZAZBnl6FW1YhFReZAsVdbv11ZBGAZBiZBVd9NJtKDQZDZD';
  
  // Asignar TuPromoStore → ShopifYa (tienda existente)
  const { error } = await supabase
    .from('stores')
    .update({
      waba_number: '+573009060443',
      meta_phone_number_id: '440561942476804',
      meta_waba_id: '427101777115842',
      meta_access_token: whatsappToken,
      meta_wa_active: true
    })
    .eq('id', '5dacb813-c0e1-4697-86db-f9c4a931f724'); // ShopifYa

  if (error) console.error('Error:', error);
  else console.log('✅ ShopifYa actualizada con WhatsApp de TuPromoStore');

  // Verificar
  const { data: verify } = await supabase
    .from('stores')
    .select('id, name, waba_number, meta_phone_number_id, meta_waba_id, meta_wa_active')
    .eq('id', '5dacb813-c0e1-4697-86db-f9c4a931f724')
    .single();
  console.log(verify);
}

main();
