const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gygrudkogjqymmcubnon.supabase.co';
const supabaseKey = 'sb_publishable_-y9QYLdGwIlOS50sTsiCeQ_-PdD_-7w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('===========================================================');
  console.log('REVISANDO PENDING_COMMENTS EN SUPABASE');
  console.log('===========================================================\n');

  const { data: comments, error } = await supabase
    .from('pending_comments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching pending_comments:', error);
    return;
  }

  console.log(`Encontrados ${comments ? comments.length : 0} comentarios en cola:\n`);
  if (comments) {
    comments.forEach((c, idx) => {
      console.log(`${idx + 1}. Sender: "${c.sender_name}" | Status: ${c.status} | Process After: ${c.process_after}`);
      console.log(`   Message: "${c.message}"`);
      console.log(`   Comment ID: ${c.comment_id}`);
      console.log(`   Created At: ${c.created_at}`);
      console.log('-----------------------------------------------------------');
    });
  }
}

main();
