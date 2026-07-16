const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  // 1. Últimos leads de TiendaPapaya
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, status, traffic_source, product_name, created_at')
    .eq('store_id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('=== ÚLTIMOS 10 LEADS DE TIENDAPAPAYA ===');
  leads?.forEach(l => {
    console.log(`  ${l.name} | ${l.phone} | ${l.status} | ${l.traffic_source} | ${l.created_at}`);
  });

  // 2. Mensajes del lead más reciente
  if (leads && leads.length > 0) {
    const latestLead = leads[0];
    console.log(`\n=== MENSAJES DEL LEAD MÁS RECIENTE: ${latestLead.name} (${latestLead.phone}) ===`);
    
    const { data: msgs } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('lead_id', latestLead.id)
      .order('created_at', { ascending: true });

    msgs?.forEach(m => {
      console.log(`  [${m.sender_type}] ${m.content?.substring(0, 100)} | ${m.created_at}`);
    });
  }

  // 3. Buscar específicamente los mensajes de prueba (tu número 573182533893)
  const { data: testLead } = await supabase
    .from('leads')
    .select('id, name, phone, status')
    .eq('store_id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .eq('phone', '573182533893')
    .single();

  if (testLead) {
    console.log(`\n=== LEAD DE PRUEBA (573182533893): ${testLead.name} | Status: ${testLead.status} ===`);
    const { data: testMsgs } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('lead_id', testLead.id)
      .order('created_at', { ascending: true });

    testMsgs?.forEach(m => {
      console.log(`  [${m.sender_type}] ${m.content?.substring(0, 100)} | ${m.created_at}`);
    });
  } else {
    console.log('\n=== No se encontró lead de prueba con 573182533893 ===');
  }

  // 4. Total de leads
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', '89aadff6-53aa-48c4-b75f-28742d1c84c4');
  
  console.log(`\n=== TOTAL LEADS TIENDAPAPAYA: ${count} ===`);
}

verify();
