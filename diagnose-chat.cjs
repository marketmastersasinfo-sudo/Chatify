const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // 1. Buscar el lead de la prueba exitosa (5:55 PM = 22:55 UTC)
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, status, board_type, store_id, traffic_source, created_at')
    .eq('store_id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('=== ÚLTIMOS LEADS DE TIENDAPAPAYA ===');
  leads?.forEach(l => {
    console.log(`  ${l.name} | ${l.phone} | board: ${l.board_type} | status: ${l.status} | source: ${l.traffic_source} | ${l.created_at}`);
  });

  // 2. Buscar leads con phone 573182533893
  const { data: testLeads } = await supabase
    .from('leads')
    .select('id, name, phone, status, board_type, store_id, created_at')
    .eq('phone', '573182533893')
    .order('created_at', { ascending: false });

  console.log('\n=== TODOS LOS LEADS CON TU NÚMERO ===');
  testLeads?.forEach(l => {
    console.log(`  ${l.name} | store: ${l.store_id?.substring(0,8)} | board: ${l.board_type} | status: ${l.status} | ${l.created_at}`);
  });

  // 3. Mensajes más recientes del lead de prueba
  if (testLeads && testLeads.length > 0) {
    for (const tl of testLeads) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('content, sender_type, created_at')
        .eq('lead_id', tl.id)
        .order('created_at', { ascending: true });

      if (msgs && msgs.length > 0) {
        console.log(`\n=== MENSAJES DEL LEAD ${tl.name} (${tl.id.substring(0,8)}) ===`);
        msgs.forEach(m => console.log(`  [${m.sender_type}] ${m.content?.substring(0, 80)} | ${m.created_at}`));
      }
    }
  }

  // 4. Revisar store completo
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, meta_phone_number_id, meta_access_token, twilio_phone_number, waba_id, meta_wa_active')
    .eq('id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .single();

  console.log('\n=== CONFIG STORE TIENDAPAPAYA ===');
  console.log('Name:', store?.name);
  console.log('Meta Phone ID:', store?.meta_phone_number_id);
  console.log('Meta Token exists:', !!store?.meta_access_token);
  console.log('Twilio Phone:', store?.twilio_phone_number);
  console.log('WABA ID:', store?.waba_id);
  console.log('Meta WA Active:', store?.meta_wa_active);
}

check();
