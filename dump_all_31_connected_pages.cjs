const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: pages, error } = await supabase.from('connected_pages').select('*');
  
  if (error) {
    console.error('Error fetching connected_pages:', error);
    return;
  }

  console.log(`=== CONTENIDO REAL DE LA TABLA connected_pages (${pages.length} REGISTROS) ===\n`);
  
  pages.forEach((p, i) => {
    console.log(`${i + 1}. Nombre: "${p.page_name}" | Page ID: ${p.page_id} | IG ID: ${p.instagram_account_id || 'null'} | Creado: ${p.created_at}`);
  });
}

main();
