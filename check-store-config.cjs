const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Get TiendaPapaya store
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, organization_id, meta_access_token, meta_phone_number_id, twilio_phone_number')
    .eq('id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .single();

  console.log('=== TIENDA ===');
  console.log('Name:', store?.name);
  console.log('Org ID:', store?.organization_id);
  console.log('Meta Phone ID:', store?.meta_phone_number_id);
  console.log('Meta Token (30 chars):', store?.meta_access_token?.substring(0, 30));
  console.log('Twilio Phone:', store?.twilio_phone_number);

  // Get the organization to check OpenAI key
  if (store?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('id, name, openai_api_key')
      .eq('id', store.organization_id)
      .single();

    console.log('\n=== ORGANIZACIÓN ===');
    console.log('Name:', org?.name);
    console.log('OpenAI Key (20 chars):', org?.openai_api_key?.substring(0, 20));
    console.log('OpenAI Key exists:', !!org?.openai_api_key);
  }

  // Check leads for this store
  const { data: leads, count } = await supabase
    .from('leads')
    .select('id, name, phone, created_at', { count: 'exact' })
    .eq('store_id', '89aadff6-53aa-48c4-b75f-28742d1c84c4')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('\n=== LEADS TIENDAPAPAYA ===');
  console.log('Total leads:', count);
  leads?.forEach(l => console.log(`  ${l.name} | ${l.phone} | ${l.created_at}`));

  // Check recent messages with errors
  const { data: msgs } = await supabase
    .from('messages')
    .select('id, content, sender_type, created_at, lead_id')
    .like('content', '%BOT CRASH%')
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('\n=== ERRORES RECIENTES ===');
  msgs?.forEach(m => console.log(`  ${m.content?.substring(0, 100)} | ${m.created_at}`));
}

check();
