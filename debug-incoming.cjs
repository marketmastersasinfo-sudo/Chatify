const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  // 1. Revisar los mensajes más recientes de TODOS los leads de TiendaPapaya (últimos 15 min)
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  
  const { data: recentMsgs } = await supabase
    .from('messages')
    .select('id, content, sender_type, created_at, lead_id')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log('=== MENSAJES DE LOS ÚLTIMOS 30 MIN (TODAS LAS TIENDAS) ===');
  recentMsgs?.forEach(m => {
    console.log(`  [${m.sender_type}] ${m.content?.substring(0, 80)} | lead: ${m.lead_id?.substring(0,8)} | ${m.created_at}`);
  });

  // 2. Buscar lead de prueba actualizado
  const { data: testLead } = await supabase
    .from('leads')
    .select('id, name, phone, status, created_at')
    .eq('store_id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .eq('phone', '573182533893')
    .single();

  if (testLead) {
    console.log(`\n=== LEAD DE PRUEBA: ${testLead.name} | Status: ${testLead.status} ===`);
    const { data: allMsgs } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('lead_id', testLead.id)
      .order('created_at', { ascending: true });

    allMsgs?.forEach(m => {
      console.log(`  [${m.sender_type}] ${m.content?.substring(0, 100)} | ${m.created_at}`);
    });
  }

  // 3. Revisar DEBUG entries en pending_comments (si el webhook recibió algo)
  const { data: debug } = await supabase
    .from('pending_comments')
    .select('comment_id, message, created_at')
    .eq('page_id', 'DEBUG')
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n=== DEBUG WEBHOOK (últimos 30 min) ===');
  if (debug && debug.length > 0) {
    debug.forEach(d => console.log(`  ${d.message?.substring(0, 120)} | ${d.created_at}`));
  } else {
    console.log('  ❌ No hay entradas de debug - El webhook NO recibió nada de Facebook');
  }

  // 4. Verificar que el webhook de Chatify esté bien configurado en el phone number
  console.log('\n=== VERIFICACIÓN API META ===');
  const token = 'EAAH5fjPTu2gBR860AMxikZBeCz6ZAMcAv8xnrQZBDseCQkitFKtNSTjbZCwJeTaGKgg4Ia2kPVYdZCBGjuhRcRpZC8dSUZAq9r5xsteBILiixpZBpvkZCshlivh5EjnIBsWhM0PpV5NZAvhAdu0dIJhdMdSR6Ax6QnOsH496V32l177Mb6RyRFafyX7C4prmTRCSkzlgZDZD';
  const res = await fetch('https://graph.facebook.com/v25.0/723025644229688?fields=webhook_configuration,verified_name,display_phone_number', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const phoneData = await res.json();
  console.log('  Phone:', phoneData.display_phone_number);
  console.log('  Webhook:', JSON.stringify(phoneData.webhook_configuration));
}

debug();
