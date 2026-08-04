const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, status, traffic_source, comment_content, comment_status, created_at')
    .eq('board_type', 'social_media')
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Últimos ${leads.length} leads de redes sociales:\n`);
  leads.forEach((l, i) => {
    console.log(`${i+1}. Source: ${l.traffic_source} | Status: ${l.status} | Delete: ${l.comment_status}`);
    console.log(`   Contenido: "${l.comment_content}"`);
    console.log('---------------------------');
  });
}

main();
