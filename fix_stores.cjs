const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const storeIdsToDelete = [
    '1e79fa71-3e0b-4861-af56-f106c4359ea7', // Lacompracion (creada por error)
    '72aee1c2-45c3-449f-a325-53844ad92c7f', // DLP (creada por error)
    '1b6a31b2-e6a5-42bc-83e8-86895797e17d', // Mundo Compra (creada por error)
  ];

  // 1. Borrar mensajes de leads asociados a esas tiendas
  for (const storeId of storeIdsToDelete) {
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('store_id', storeId);

    if (leads && leads.length > 0) {
      const leadIds = leads.map(l => l.id);
      const { error: msgErr } = await supabase
        .from('messages')
        .delete()
        .in('lead_id', leadIds);
      if (msgErr) console.error(`Error borrando mensajes de store ${storeId}:`, msgErr);
      else console.log(`Mensajes borrados para ${leadIds.length} leads de store ${storeId}`);

      const { error: leadErr } = await supabase
        .from('leads')
        .delete()
        .eq('store_id', storeId);
      if (leadErr) console.error(`Error borrando leads de store ${storeId}:`, leadErr);
      else console.log(`Leads borrados de store ${storeId}`);
    }
  }

  // 2. Borrar las 3 tiendas incorrectas
  const { error: storeErr } = await supabase
    .from('stores')
    .delete()
    .in('id', storeIdsToDelete);
  if (storeErr) console.error('Error borrando tiendas:', storeErr);
  else console.log('✅ 3 tiendas incorrectas BORRADAS (Lacompracion, DLP, Mundo Compra)');

  // 3. Asignar credenciales de WhatsApp a la tienda EXISTENTE "Dondelosprimos"
  const whatsappToken = 'EAAa44lUrYZBIBRzW4WWUAjhC1Cjp51POwJqMEjf7lYziegac72KUCthi7656qLAw6qRu2pzMs9FSccmyS6suOIuD74qqulif8sekPYXVbjCkl7fef61UUQQpr0KRG1eLiWOEqqDnzwjIL2trOm2EnDSG7MqCEDW3eSrnVZBwb8uUZCGr0goOoAR9pDWDTidGgZDZD';
  
  const { error: updateErr } = await supabase
    .from('stores')
    .update({
      waba_number: '+573166563246',
      meta_phone_number_id: '454283704431997',
      meta_waba_id: '477305412128610',
      meta_access_token: whatsappToken,
      meta_wa_active: true
    })
    .eq('id', '6345ebc8-a310-4d90-b793-05a6f4041cdd'); // Dondelosprimos existente

  if (updateErr) console.error('Error actualizando Dondelosprimos:', updateErr);
  else console.log('✅ Dondelosprimos actualizada con WhatsApp de Donde los Primos Col');

  // 4. Verificar
  const { data: verify } = await supabase
    .from('stores')
    .select('id, name, waba_number, meta_phone_number_id, meta_waba_id, meta_wa_active')
    .eq('id', '6345ebc8-a310-4d90-b793-05a6f4041cdd')
    .single();
  console.log('\n=== VERIFICACIÓN ===');
  console.log(verify);
}

main();
