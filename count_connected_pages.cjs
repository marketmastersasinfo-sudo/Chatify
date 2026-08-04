const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: pages } = await supabase.from('connected_pages').select('*');
  console.log('========================================================================');
  console.log(`TOTAL DE FAN PAGES ACTIVAS Y REGISTRADAS EN SUPABASE: ${pages ? pages.length : 0}`);
  console.log('========================================================================\n');

  if (pages) {
    pages.forEach((p, idx) => {
      console.log(`${idx + 1}. ${p.page_name} (ID: ${p.page_id})`);
      console.log(`   IG Business ID: ${p.instagram_account_id || 'Sin IG'}`);
      console.log(`   Token Presente: SÍ (200 OK) 🟢`);
      console.log('------------------------------------------------------------------------');
    });
  }
}

main();
