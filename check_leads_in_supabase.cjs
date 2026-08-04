const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('===========================================================');
  console.log('REVISANDO LEADS DE SOCIAL MEDIA EN SUPABASE');
  console.log('===========================================================\n');

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, name, status, board_type, comment_content, comment_status, store_id, created_at')
    .eq('board_type', 'social_media')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching leads:', error);
    return;
  }

  console.log(`Encontrados ${leads ? leads.length : 0} leads de redes sociales:\n`);
  if (leads) {
    leads.forEach((l, idx) => {
      console.log(`${idx + 1}. Nombre: "${l.name}" | Status: "${l.status}" | Store ID: ${l.store_id || 'null'}`);
      console.log(`   Comentario: "${l.comment_content}"`);
      console.log(`   Estado Comentario: ${l.comment_status} | Creado: ${l.created_at}`);
      console.log('-----------------------------------------------------------');
    });
  }
}

main();
