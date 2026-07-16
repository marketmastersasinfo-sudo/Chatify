const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
  // 1. Check recent leads for TiendaPapaya
  const { data: leads } = await supabase
    .from('leads')
    .select('id, name, phone, store_id, created_at, source')
    .eq('store_id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('=== ÚLTIMOS LEADS DE TIENDAPAPAYA ===');
  leads?.forEach(l => console.log(`  ${l.name} | ${l.phone} | ${l.source} | ${l.created_at}`));

  // 2. Check recent messages
  const { data: msgs } = await supabase
    .from('messages')
    .select('id, content, sender_type, created_at, lead_id')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n=== ÚLTIMOS 10 MENSAJES EN CHATIFY ===');
  msgs?.forEach(m => console.log(`  [${m.sender_type}] ${m.content?.substring(0, 60)} | ${m.created_at}`));

  // 3. Check debug entries in pending_comments
  const { data: debug } = await supabase
    .from('pending_comments')
    .select('comment_id, message, created_at')
    .eq('page_id', 'DEBUG')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== DEBUG WEBHOOK (pending_comments) ===');
  debug?.forEach(d => console.log(`  ${d.comment_id} | ${d.message?.substring(0, 80)} | ${d.created_at}`));
}

checkAll();
