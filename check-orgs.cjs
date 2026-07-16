const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  // Get all organizations with OpenAI keys
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, openai_api_key');

  console.log('=== TODAS LAS ORGANIZACIONES ===');
  orgs?.forEach(o => console.log(`  ${o.name || 'SIN NOMBRE'} | ID: ${o.id} | OpenAI: ${o.openai_api_key ? o.openai_api_key.substring(0, 20) + '...' : 'NO TIENE'}`));

  // Get TiendaPapaya's org
  const { data: tpOrg } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', '9e8f8795-5fc7-4bbc-af6f-b19f64214dd9')
    .single();

  console.log('\n=== ORG DE TIENDAPAPAYA ===');
  console.log(JSON.stringify(tpOrg, null, 2));
}

check();
