const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('===========================================================');
  console.log('CORRIGIENDO ESTADOS DE LEADS EN SUPABASE PARA EL CRM');
  console.log('===========================================================\n');

  // Update all deleted comments to status = 'moderado' so they appear in "Moderado / Humano" column
  const { data, error } = await supabase
    .from('leads')
    .update({ status: 'moderado' })
    .eq('comment_status', 'deleted');

  if (error) {
    console.error('Error actualizando estados:', error);
  } else {
    console.log('✅ ¡Estados de comentarios eliminados actualizados a `moderado` en Supabase!');
  }

  // Count leads by status
  const { data: moderados } = await supabase.from('leads').select('id').eq('status', 'moderado');
  const { data: comentarios } = await supabase.from('leads').select('id').eq('status', 'comentario');

  console.log(`\n📊 Conteo Actual en CRM de Chatify:`);
  console.log(`   - Columna "Comentario Público": ${comentarios ? comentarios.length : 0}`);
  console.log(`   - Columna "Moderado / Humano": ${moderados ? moderados.length : 0}`);
}

main();
